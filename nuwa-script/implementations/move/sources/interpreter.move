module nuwa_script_move::interpreter {
    use std::string::{String};
    use std::vector;
    use std::option::{Option, is_some, borrow, destroy_some};
    use moveos_std::simple_map::{Self, SimpleMap}; // For tool args
    use moveos_std::type_info; // Potentially needed for tools or advanced features
    use moveos_std::event; // Import event system (adjust for Rooch's specific event API if different)
    use moveos_std::timestamp; // Import Rooch timestamp module

    // Import other modules from this package
    use nuwa_script_move::ast::{Self, Script, Statement, Expression, LetStatement, CallStatement, IfStatement, ForStatement, PrintStatement, LiteralExpr, VariableExpr, BinaryOpExpr, UnaryOpExpr, CallExpr, FuncCallExpr};
    use nuwa_script_move::values::{Self, Value};
    use nuwa_script_move::errors;
    use nuwa_script_move::state::{Self, State};
    use nuwa_script_move::tools::{Self, ToolRegistry, ToolSchema};

    /// Event emitted when PRINT statement is executed.
    /// Value needs `copy, drop, store` if directly included.
    /// Alternatively, serialize the Value to string/bytes for the event.
    struct PrintEvent has copy, drop, store {
        output_value: Value, // Store the runtime Value directly
        // Or: output_string: String, // Store a string representation
    }

    // --- Main Interpreter Execution Function ---

    /// Executes a NuwaScript AST.
    /// Takes the script AST, a tool registry, and an initial state.
    /// Returns the final state after execution.
    /// TODO: Add context parameter if tools need access to it (e.g., sender address).
    /// TODO: Add output handler mechanism (e.g., emitting events for PRINT).
    public fun execute_script(
        script: Script,
        registry: &ToolRegistry,
        initial_state: State,
        // Add context: &TxContext ? or custom context struct?
    ): State {
        let state = initial_state;
        execute_statements(ast::statements(&script), &mut state, registry);
        state
    }

    // --- Internal Execution Helpers ---

    /// Executes a sequence of statements.
    fun execute_statements(
        statements: &vector<Statement>,
        state: &mut State,
        registry: &ToolRegistry,
        // context: &Context,
    ) {
        let i = 0;
        let len = vector::length(statements);
        while (i < len) {
            let statement = vector::borrow(statements, i);
            execute_statement(statement, state, registry);
            // TODO: Add checks for early termination/return if needed later.
            i = i + 1;
        }
    }

    /// Executes a single statement, dispatching based on its type.
    fun execute_statement(
        statement: &Statement,
        state: &mut State,
        registry: &ToolRegistry,
        // context: &Context,
    ) {
        // Dispatch based on which Option field is Some in the Statement struct
        if (is_some(ast::let_stmt(statement))) {
            execute_let_statement(borrow(ast::let_stmt(statement)), state, registry);
        } else if (is_some(ast::call_stmt(statement))) {
            execute_call_statement(borrow(ast::call_stmt(statement)), state, registry);
        } else if (is_some(ast::if_stmt(statement))) {
            execute_if_statement(borrow(ast::if_stmt(statement)), state, registry);
        } else if (is_some(ast::for_stmt(statement))) {
            execute_for_statement(borrow(ast::for_stmt(statement)), state, registry);
        } else if (is_some(ast::print_stmt(statement))) {
            execute_print_statement(borrow(ast::print_stmt(statement)), state, registry);
        } else {
            // Should not happen if AST is well-formed
            std::debug::print(statement); // Debug print the unrecognized statement
            abort errors::E_INVALID_AST_STRUCTURE // Assuming this error exists
        };
    }

    // --- Statement Execution Implementations ---

    fun execute_let_statement(
        stmt: &LetStatement,
        state: &mut State,
        registry: &ToolRegistry,
    ) {
        let value = evaluate_expression(ast::let_value(stmt), state, registry);
        state::set_variable(state, *ast::let_variable_name(stmt), value);
    }

    fun execute_call_statement(
        stmt: &CallStatement,
        state: &mut State,
        registry: &ToolRegistry,
    ) {
        // Evaluate arguments first
        let evaluated_args = evaluate_argument_map(ast::call_args(stmt), state, registry);
        // Execute the tool call (result ignored for statements)
        let _result = execute_tool_call(ast::call_tool_name(stmt), &evaluated_args, state, registry);
        // Free the evaluated args map if necessary
        // simple_map::destroy_empty(evaluated_args); // Or let it drop if it has drop ability
    }

     fun execute_print_statement(
        stmt: &PrintStatement,
        state: &mut State, // Pass state in case expression uses variables
        registry: &ToolRegistry,
    ) {
        let value_to_print = evaluate_expression(ast::print_value(stmt), state, registry);
        event::emit(PrintEvent { output_value: value_to_print });
    }

    // Placeholder implementations for control flow
    fun execute_if_statement(
        stmt: &IfStatement,
        state: &mut State,
        registry: &ToolRegistry,
    ) {
        // 1. Evaluate the condition expression
        let condition_value = evaluate_expression(ast::if_condition(stmt), state, registry);

        // 2. Check if the result is a boolean
        assert!(values::is_bool(&condition_value), errors::E_IF_CONDITION_NOT_BOOLEAN);
        let condition_result = values::get_bool(&condition_value);

        // 3. Execute the appropriate block
        if (condition_result) {
            // Execute the 'then' block
            execute_statements(ast::if_then_block(stmt), state, registry);
        } else {
            // Check if an 'else' block exists
            let else_block_option = ast::if_else_block(stmt);
            if (option::is_some(&else_block_option)) {
                // Execute the 'else' block
                execute_statements(option::borrow(&else_block_option), state, registry);
                // Note: If option::destroy_some is needed to avoid borrow issues,
                // ensure the AST struct allows this (might need adjustment if AST is borrowed).
                // Assuming borrowing works here.
            }
            // If no else block, do nothing
        }
    }

    fun execute_for_statement(
        stmt: &ForStatement,
        state: &mut State,
        registry: &ToolRegistry,
    ) {
        // 1. Evaluate the expression that should yield the list
        let iterable_value = evaluate_expression(ast::for_iterable(stmt), state, registry);

        // 2. Check if the result is a list
        assert!(values::is_list(&iterable_value), errors::E_FOR_ITERABLE_NOT_LIST);

        // 3. Borrow the vector from the list Value
        // We borrow immutably first to get the length and items.
        let item_list_vec = values::borrow_list(&iterable_value);
        let len = vector::length(item_list_vec);
        let i = 0;
        let iterator_var_name = *ast::for_iterator_variable(stmt); // Get a copy of the name string

        // 4. Iterate through the list items
        while (i < len) {
            // Get a *copy* of the current item to assign to the loop variable.
            // This prevents the loop block from potentially modifying the original list
            // through the iterator variable if complex references were involved.
            let current_item = *vector::borrow(item_list_vec, i);

            // a. Set the iterator variable for the current iteration, saving the old value
            let old_value_option = state::set_temporary_variable(
                state,
                iterator_var_name, // Pass copy of name
                current_item       // Pass copy of item
            );

            // b. Execute the loop block statements
            // Note: Loop block execution might fail, potentially leaving state inconsistent
            // if not handled carefully. Move's abort mechanism handles this well.
            execute_statements(ast::for_loop_block(stmt), state, registry);

            // c. Restore the original value (or remove the variable if it was new)
            // Pass copy of name again
            state::restore_variable(state, iterator_var_name, old_value_option);

            i = i + 1;
        };

        // Loop finished. Iterator variable state is restored.
    }


    // --- Expression Evaluation ---

    /// Evaluates an expression node and returns its runtime Value.
    fun evaluate_expression(
        expression: &Expression,
        state: &State,
        registry: &ToolRegistry,
    ): Value {
        // Dispatch based on which Option field is Some in the Expression struct
        if (is_some(ast::literal_expr(expression))) {
            evaluate_literal_expr(borrow(ast::literal_expr(expression)))
        } else if (is_some(ast::variable_expr(expression))) {
            evaluate_variable_expr(borrow(ast::variable_expr(expression)), state)
        } else if (is_some(ast::binary_op_expr(expression))) {
            evaluate_binary_op_expr(borrow(ast::binary_op_expr(expression)), state, registry)
        } else if (is_some(ast::unary_op_expr(expression))) {
            evaluate_unary_op_expr(borrow(ast::unary_op_expr(expression)), state, registry)
        } else if (is_some(ast::call_expr(expression))) {
            evaluate_call_expr(borrow(ast::call_expr(expression)), state, registry)
        } else if (is_some(ast::func_call_expr(expression))) {
            evaluate_func_call_expr(borrow(ast::func_call_expr(expression)))
        } else {
            std::debug::print(expression);
            abort errors::E_INVALID_AST_STRUCTURE
        }
    }

    // --- Expression Evaluation Implementations ---

    fun evaluate_literal_expr(expr: &LiteralExpr): Value {
        // The LiteralExpr in AST already holds a runtime Value
        *ast::literal_value(expr)
    }

    fun evaluate_variable_expr(expr: &VariableExpr, state: &State): Value {
        let name = ast::variable_name(expr);
        // Handle potential member access (e.g., "obj.prop")
        if (std::string::contains(name, &std::string::utf8(b"."))) {
            evaluate_member_access(name, state)
        } else {
            // Simple variable lookup, copy the value
            state::get_variable_copy(state, name)
        }
    }

    fun evaluate_member_access(full_name: &String, state: &State): Value {
        // Need a way to split the string by '.'
        // Placeholder: Assume we get a vector<String> parts.
        // If no direct split function, this needs manual parsing loop.
        // Example: let parts = std::string::split(full_name, b'.');
        // For now, we'll simulate with basic logic if only one dot exists.
        // This needs a robust implementation!

        // --- START: Placeholder/Simplified Split Logic ---
        // Find the first dot. A real implementation needs to handle multiple dots.
        let maybe_dot_index = std::string::index_of(full_name, &std::string::utf8(b"."));

        assert!(option::is_some(&maybe_dot_index), errors::E_INVALID_AST_STRUCTURE); // Should have a dot if called

        let dot_index = option::destroy_some(maybe_dot_index);

        // Extract base variable name and the first member name
        // std::string::sub_string requires indices, which can be tricky with UTF-8.
        // Assume functions exist for this example:
        // base_name = std::string::substring(full_name, 0, dot_index);
        // remaining_members_str = std::string::substring(full_name, dot_index + 1, std::string::length(full_name));

        // --- THIS MANUAL SPLIT IS VERY LIMITED AND LIKELY INEFFICIENT/INCORRECT ---
        // --- A proper implementation is needed, maybe native or better string utils ---
        // --- Let's proceed with the access logic assuming `parts: vector<String>` exists ---

        // --- Correct Logic Assuming `parts: vector<String>` ---
        // 1. Split full_name by '.' -> parts: vector<String>
        // assert!(vector::length(&parts) > 1, errors::E_INVALID_AST_STRUCTURE);
        // let base_name = vector::borrow(&parts, 0);
        // 2. Get the base variable value
        // assert!(state::variable_exists(state, base_name), errors::E_VARIABLE_NOT_DEFINED);
        // let mut current_value_ref = state::borrow_variable(state, base_name); // Start with ref

        // 3. Iterate through subsequent parts (member names)
        // let i = 1;
        // let len = vector::length(&parts);
        // while (i < len) {
        //     let member_name = vector::borrow(&parts, i);
        //     // Check if current value is an Object
        //     assert!(values::is_object(current_value_ref), errors::E_MEMBER_ACCESS_ON_NON_OBJECT);
        //     let object_map = values::borrow_object(current_value_ref);
        //
        //     // Check if member exists in the object
        //     assert!(simple_map::contains_key(object_map, member_name), errors::E_MEMBER_NOT_FOUND);
        //
        //     // Update current_value_ref for the next iteration
        //     current_value_ref = simple_map::borrow(object_map, member_name);
        //     i = i + 1;
        // }

        // 4. Return a copy of the final accessed value
        // return *current_value_ref // Dereference to copy

        // --- End Correct Logic ---

        // --- ABORTING as string splitting and iteration logic is complex ---
        abort errors::E_NOT_IMPLEMENTED // Placeholder until string split/iteration is solved
    }


    // Placeholder implementations for operations
    fun evaluate_binary_op_expr(
        expr: &BinaryOpExpr,
        state: &State,
        registry: &ToolRegistry,
    ): Value {
        // Evaluate operands lazily? No, Move evaluates function args eagerly.
        // Evaluate both sides first.
        let left_val = evaluate_expression(ast::binary_op_left(expr), state, registry);
        let right_val = evaluate_expression(ast::binary_op_right(expr), state, registry);
        let op = ast::binary_op_operator(expr);

        // Logical Operators (expect booleans)
        if (*op == std::string::utf8(b"AND")) {
            assert!(values::is_bool(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_bool(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_bool(&left_val) && values::get_bool(&right_val))
        } else if (*op == std::string::utf8(b"OR")) {
            assert!(values::is_bool(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_bool(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_bool(&left_val) || values::get_bool(&right_val))
        }
        // Equality Operators (use values::equals for type flexibility)
        else if (*op == std::string::utf8(b"==")) {
            values::new_bool(values::equals(&left_val, &right_val))
        } else if (*op == std::string::utf8(b"!=")) {
            values::new_bool(!values::equals(&left_val, &right_val))
        }
        // Comparison Operators (expect u64 for now)
        else if (*op == std::string::utf8(b">")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_u64(&left_val) > values::get_u64(&right_val))
        } else if (*op == std::string::utf8(b"<")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_u64(&left_val) < values::get_u64(&right_val))
        } else if (*op == std::string::utf8(b">=")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_u64(&left_val) >= values::get_u64(&right_val))
        } else if (*op == std::string::utf8(b"<=")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            values::new_bool(values::get_u64(&left_val) <= values::get_u64(&right_val))
        }
        // --- START: Add Arithmetic Operators ---
        else if (*op == std::string::utf8(b"+")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            let l = values::get_u64(&left_val);
            let r = values::get_u64(&right_val);
            // Move u64 addition wraps on overflow by default. Check if explicit check needed.
            // Use std::math::checked_add if overflow should abort.
            // assert!(std::math::check_add(l, r), errors::E_ARITHMETIC_OVERFLOW);
            values::new_u64(l + r)
        } else if (*op == std::string::utf8(b"-")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            let l = values::get_u64(&left_val);
            let r = values::get_u64(&right_val);
            // Move u64 subtraction wraps on underflow by default.
            // Use std::math::checked_sub if underflow should abort.
            // assert!(l >= r, errors::E_ARITHMETIC_OVERFLOW); // Or checked_sub
            values::new_u64(l - r)
        } else if (*op == std::string::utf8(b"*")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            let l = values::get_u64(&left_val);
            let r = values::get_u64(&right_val);
            // Move u64 multiplication wraps on overflow by default.
            // Use std::math::checked_mul if overflow should abort.
            // assert!(std::math::check_mul(l, r), errors::E_ARITHMETIC_OVERFLOW);
            values::new_u64(l * r)
        } else if (*op == std::string::utf8(b"/")) {
            assert!(values::is_u64(&left_val), errors::E_OPERATION_TYPE_MISMATCH);
            assert!(values::is_u64(&right_val), errors::E_OPERATION_TYPE_MISMATCH);
            let l = values::get_u64(&left_val);
            let r = values::get_u64(&right_val);
            // Check for division by zero
            assert!(r != 0, errors::E_DIVISION_BY_ZERO);
            // Integer division
            values::new_u64(l / r)
        }
        // --- END: Add Arithmetic Operators ---
        else {
            // Unsupported binary operator
            abort errors::E_UNSUPPORTED_OPERATOR
        }
    }

    fun evaluate_unary_op_expr(
        expr: &UnaryOpExpr,
        state: &State,
        registry: &ToolRegistry,
    ): Value {
        let operand_value = evaluate_expression(ast::unary_operand(expr), state, registry);
        let op = ast::unary_op_operator(expr);

        if (*op == std::string::utf8(b"NOT")) {
            // Expect operand to be a boolean
            assert!(values::is_bool(&operand_value), errors::E_OPERATION_TYPE_MISMATCH);
            let bool_val = values::get_bool(&operand_value);
            values::new_bool(!bool_val)
        } else {
            // Unsupported unary operator
            abort errors::E_UNSUPPORTED_OPERATOR // Add this error code to errors.move
        }
    }

    // Evaluate CALL used as expression
    fun evaluate_call_expr(
        expr: &CallExpr,
        state: &State, // Pass as immutable for expression evaluation
        registry: &ToolRegistry,
    ): Value {
        // Evaluate arguments first (state needed if args reference variables)
        let evaluated_args = evaluate_argument_map(ast::call_expr_args(expr), state, registry);
        // Execute the tool call
        let result = execute_tool_call(ast::call_expr_tool_name(expr), &evaluated_args, state, registry); // Pass immutable state? Tools shouldn't modify state directly in expressions.
        // Free evaluated args map if necessary
        // simple_map::destroy_empty(evaluated_args);
        result
    }

    // fun evaluate_func_call_expr(...) { ... handle NOW() ... }

    // --- Tool Call Helper ---

    /// Evaluates the argument expressions in a map.
    fun evaluate_argument_map(
        args_expr: &SimpleMap<String, Expression>,
        state: &State,
        registry: &ToolRegistry,
    ): SimpleMap<String, Value> {
        let evaluated_args = simple_map::new<String, Value>();
        // Assumes simple_map::keys() returns a vector of keys.
        // The actual API might differ slightly.
        let keys = simple_map::keys(args_expr);
        let i = 0;
        let len = vector::length(&keys);

        while (i < len) {
            let key = vector::borrow(&keys, i);
            let value_expr = simple_map::borrow(args_expr, key);
            let value = evaluate_expression(value_expr, state, registry);
            // Add a copy of the key and the evaluated value
            simple_map::add(&mut evaluated_args, *key, value);
            i = i + 1;
        };
        // Need to destroy the keys vector if it was copied
        // vector::destroy_empty(keys); // Depends on exact simple_map::keys() behavior

        evaluated_args
    }

    /// Executes a tool call by dispatching based on the tool name.
    /// This is where the mapping from tool name string to actual Move function happens.
    fun execute_tool_call(
        tool_name: &String,
        evaluated_args: &SimpleMap<String, Value>,
        state: &State, // or &mut State if tools can modify state? Decide carefully.
        registry: &ToolRegistry,
    ): Value {
        // 1. Lookup tool schema
        assert!(tools::is_tool_registered(registry, tool_name), errors::E_TOOL_NOT_FOUND);
        let schema = tools::borrow_tool_schema(registry, tool_name);

        // 2. Validate arguments against schema (arity, types)
        // TODO: Implement argument validation based on schema.parameters
        // - Check required parameters exist in evaluated_args.
        // - Check type tags of values in evaluated_args match schema parameter type tags.
        // - Abort with E_MISSING_ARGUMENT or E_WRONG_ARGUMENT_TYPE if validation fails.

        // 3. Dispatch to the actual Move function implementing the tool
        //    THIS IS THE CORE CHALLENGE in Move without function pointers.
        //    Requires hardcoded conditional logic based on tool_name.
        let result = if (*tool_name == std::string::utf8(b"get_price")) {
             // Example: Assume a tool function exists: tools_impl::get_price(args, context): Value
             // Need to extract specific args from evaluated_args map, check types, call.
             // let token_arg = simple_map::borrow(evaluated_args, &std::string::utf8(b"token"));
             // assert!(values::is_string(token_arg), ...);
             // let token = values::borrow_string(token_arg);
             // tools_impl::get_price(token, /* context? */)
             abort errors::E_NOT_IMPLEMENTED // Placeholder for tool implementation call
        } else if (*tool_name == std::string::utf8(b"swap")) {
             // tools_impl::swap(...)
             abort errors::E_NOT_IMPLEMENTED
        } else if (*tool_name == std::string::utf8(b"print")) {
             // Handle print specifically if it's invoked via CALL (unlikely?)
             // Usually PRINT is a dedicated statement/function.
              abort errors::E_NOT_IMPLEMENTED
        } else {
             // Tool name is registered but no implementation branch found here.
             abort errors::E_TOOL_NOT_FOUND // Or maybe E_NOT_IMPLEMENTED
        };

        // 4. Check if the result type matches the schema's return_type_tag
        assert!(values::type_tag(&result) == tools::schema_return_type_tag(schema), errors::E_TOOL_WRONG_RETURN_TYPE); // Add error code

        result
    }

    fun evaluate_func_call_expr(
        expr: &FuncCallExpr,
    ): Value {
        let name = ast::func_call_name(expr);
        if (*name == std::string::utf8(b"NOW")) {
            // Call timestamp module directly
            let timestamp_seconds = timestamp::now_seconds();
            values::new_u64(timestamp_seconds)
        } else {
            abort errors::E_UNKNOWN_BUILTIN_FUNCTION
        }
    }

}
