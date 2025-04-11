module nuwa_script_move::ast {
    use std::string::{String};
    use std::vector;
    use std::option::{Option};
    use moveos_std::box::{Box}; // For recursive types
    use moveos_std::type_info; // If we need runtime type info (less likely for AST)
    // Assuming we use SimpleMap or Table for argument/variable maps
    use moveos_std::simple_map::{SimpleMap};

    // Forward declare Value from values module
    use nuwa_script_move::values::Value;

    // Note: Move doesn't support enums with rich associated data like Rust/Swift.
    // We define distinct structs for each node type.
    // The challenge lies in how lists of statements/expressions are represented
    // if they need to contain heterogeneous types polymorphically.
    // Often, the AST is serialized off-chain, and the Move interpreter
    // receives and deserializes it, or works with specific function calls
    // corresponding to the execution flow.

    // --- Top Level ---
    struct Script has copy, drop, store {
        // How to represent vector<Statement> is the key challenge.
        // Option 1: Separate vectors per statement type (very inflexible).
        // Option 2: Use vector<vector<u8>> storing serialized statements (common).
        // Option 3: Use a wrapper struct/enum if the Move env supports it.
        // For now, let's define the individual structs. The representation
        // of the script's body needs further design based on interpreter strategy.
        // Placeholder:
        // statements: vector<StatementPlaceholder>,
    }

    // --- Statements ---
    struct LetStatement has copy, drop, store {
        variable_name: String,
        value: ExpressionPlaceholder, // Placeholder for how Expression is referenced
    }

    struct CallStatement has copy, drop, store {
        tool_name: String,
        arguments: SimpleMap<String, ExpressionPlaceholder>,
    }

    struct IfStatement has copy, drop, store {
        condition: ExpressionPlaceholder,
        then_block: vector<StatementPlaceholder>, // Placeholder vector
        else_block: Option<vector<StatementPlaceholder>>,
    }

    struct ForStatement has copy, drop, store {
        iterator_variable: String,
        iterable: ExpressionPlaceholder,
        loop_block: vector<StatementPlaceholder>, // Placeholder vector
    }

    // Represents PRINT(...) etc., used as a statement
    struct FunctionCallStatement has copy, drop, store {
        call: FunctionCallExpr, // Reuse the expression struct
    }


    // --- Expressions ---
    struct LiteralExpr has copy, drop, store {
        value: Value,
    }

    struct VariableExpr has copy, drop, store {
        name: String, // e.g., "myVar", "myObj.prop1.prop2"
    }

    struct BinaryOpExpr has copy, drop, store {
        operator: String, // "==", ">", "AND", "+", "*" etc.
        left: Box<ExpressionPlaceholder>,
        right: Box<ExpressionPlaceholder>,
    }

    struct UnaryOpExpr has copy, drop, store {
        operator: String, // "NOT"
        operand: Box<ExpressionPlaceholder>,
    }

    struct FunctionCallExpr has copy, drop, store {
        function_name: String, // "NOW", "PRINT"
        arguments: vector<ExpressionPlaceholder>,
    }

    struct CallExpr has copy, drop, store {
        tool_name: String,
        arguments: SimpleMap<String, ExpressionPlaceholder>,
    }

    struct CalcExpr has copy, drop, store {
        formula: String,
        variables: SimpleMap<String, ExpressionPlaceholder>,
    }

    // --- Placeholders ---
    // These placeholders represent the core challenge: How to represent
    // a value that could be *any* kind of Expression or Statement.
    // This often points towards off-chain parsing and serialization.
    struct ExpressionPlaceholder has copy, drop, store { /* ... */ }
    struct StatementPlaceholder has copy, drop, store { /* ... */ }

    // If the interpreter works by direct function calls matching the script flow
    // instead of interpreting a serialized AST, these structs might only be conceptual.

    // --- Public functions (Constructors) ---
    // These might be less relevant if AST is built off-chain.

    // Example constructor (adjust based on final ExpressionPlaceholder strategy)
    // public fun new_let(name: String, value_expr: ExpressionPlaceholder): StatementPlaceholder { ... }

}
