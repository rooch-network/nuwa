import time
import operator
from typing import Any, Dict, List, Optional, Callable

# Import simpleeval
try:
    import simpleeval
except ImportError:
    # Provide a fallback or raise a more informative error if simpleeval is critical
    print("Warning: simpleeval library not found. CALC functionality will be limited.")
    print("Please install it: pip install simpleeval")
    simpleeval = None # Set to None to handle gracefully later

# Import AST nodes
from .ast import (
    Node, Script, Statement, LetStatement, CallStatement, IfStatement, ForStatement,
    Expression, Literal, Variable, BinaryOp, UnaryOp, FunctionCall,
    CallExpression, CalcExpression
)
# Import a basic ToolRegistry concept (will be defined in tools.py later)
from .tools import ToolRegistry, ToolNotFoundException

class InterpreterError(Exception):
    """Custom exception for runtime errors during interpretation."""
    pass

class Interpreter:
    def __init__(self,
                 tool_registry: Optional[ToolRegistry] = None,
                 output_handler: Optional[Callable[[Any], None]] = None):
        """
        Initializes the interpreter.

        Args:
            tool_registry: An optional ToolRegistry instance to handle CALLs.
            output_handler: An optional callable that takes one argument
                              and handles output from the print() function.
                              If None, defaults to Python's print().
        """
        self.variables: Dict[str, Any] = {} # Global variable scope for now
        self.tool_registry = tool_registry if tool_registry else ToolRegistry() # Use a default empty registry if none provided
        # Store the output handler, defaulting to Python's print
        self.output_handler = output_handler if output_handler is not None else print

    def execute(self, script: Script):
        """Executes a full script."""
        if not isinstance(script, Script):
            raise InterpreterError("Invalid input: execute expects a Script node.")
        self._execute_statements(script.statements)

    def _execute_statements(self, statements: List[Statement]):
        """Executes a list of statements."""
        for statement in statements:
            self._execute_statement(statement)

    def _execute_statement(self, statement: Statement):
        """Executes a single statement node."""
        method_name = f'_execute_{type(statement).__name__}'
        executor = getattr(self, method_name, self._execution_not_implemented)
        executor(statement)

    def _execution_not_implemented(self, node: Node):
        """Handles execution for unimplemented statement types."""
        raise InterpreterError(f"Execution not implemented for AST node type: {type(node).__name__}")

    # --- Statement Executors ---

    def _execute_LetStatement(self, node: LetStatement):
        """Executes LET var = expression."""
        value = self._evaluate_expression(node.value)
        self.variables[node.variable_name] = value
        # print(f"LET {node.variable_name} = {value}") # Debug print

    def _execute_CallStatement(self, node: CallStatement):
        """Executes CALL tool { args }."""
        self._execute_tool_call(node.tool_name, node.arguments)

    def _execute_IfStatement(self, node: IfStatement):
        """Executes IF condition THEN ... [ELSE ...] END."""
        condition_result = self._evaluate_expression(node.condition)
        if not isinstance(condition_result, bool):
            raise InterpreterError(f"IF condition did not evaluate to a boolean, got: {type(condition_result)}")

        if condition_result:
            self._execute_statements(node.then_block)
        elif node.else_block:
            self._execute_statements(node.else_block)

    def _execute_ForStatement(self, node: ForStatement):
        """Executes FOR var IN iterable DO ... END."""
        iterable_value = self._evaluate_expression(node.iterable)
        if not isinstance(iterable_value, list): # Currently only support iterating lists
             raise InterpreterError(f"FOR loop expected an iterable list, got: {type(iterable_value)}")

        # Basic loop implementation - consider adding loop limits for safety
        for item in iterable_value:
             # Create a temporary scope for the loop variable (overwrites if name clashes)
             # A proper implementation might use nested scopes
             original_value = self.variables.get(node.iterator_variable)
             self.variables[node.iterator_variable] = item
             try:
                 self._execute_statements(node.loop_block)
             finally:
                 # Restore original variable value or remove if it didn't exist
                 if original_value is not None:
                     self.variables[node.iterator_variable] = original_value
                 else:
                     del self.variables[node.iterator_variable]

    # Add this method to handle FunctionCall as a statement
    def _execute_FunctionCall(self, node: FunctionCall):
        """Executes a function call used as a statement (primarily for print())."""
        # Evaluate the function call for its side effects.
        # The return value (e.g., None for print) is ignored for statements.
        self._evaluate_FunctionCall(node)

    # --- Expression Evaluators ---

    def _evaluate_expression(self, node: Expression) -> Any:
        """Evaluates a single expression node."""
        method_name = f'_evaluate_{type(node).__name__}'
        evaluator = getattr(self, method_name, self._evaluation_not_implemented)
        return evaluator(node)

    def _evaluation_not_implemented(self, node: Node):
        """Handles evaluation for unimplemented expression types."""
        raise InterpreterError(f"Evaluation not implemented for AST node type: {type(node).__name__}")

    def _evaluate_Literal(self, node: Literal) -> Any:
        """Evaluates a literal value."""
        return node.value

    def _evaluate_Variable(self, node: Variable) -> Any:
        """Evaluates a variable by looking it up, handling member access."""
        if '.' in node.name:
            parts = node.name.split('.')
            base_var_name = parts[0]
            if base_var_name not in self.variables:
                raise InterpreterError(f"Variable '{base_var_name}' not found for member access '{node.name}'")

            current_value = self.variables[base_var_name]
            current_path = base_var_name

            # Iterate through the parts after the base variable
            for member_name in parts[1:]:
                # Currently only support dict-like access
                if isinstance(current_value, dict):
                    if member_name in current_value:
                        current_value = current_value[member_name]
                        current_path += f".{member_name}"
                    else:
                        raise InterpreterError(f"Member '{member_name}' not found in '{current_path}' (value: {self.variables[base_var_name]})")
                # Add support for object attribute access later if needed (getattr)
                # elif hasattr(current_value, member_name):
                #    current_value = getattr(current_value, member_name)
                #    current_path += f".{member_name}"
                else:
                    raise InterpreterError(f"Cannot access member '{member_name}' on non-dictionary value at '{current_path}' (type: {type(current_value)})")
            return current_value
        elif node.name in self.variables:
            return self.variables[node.name]
        else:
            raise InterpreterError(f"Variable '{node.name}' not defined.")

    def _evaluate_BinaryOp(self, node: BinaryOp) -> Any:
        """Evaluates a binary operation."""
        left_val = self._evaluate_expression(node.left)
        right_val = self._evaluate_expression(node.right)

        op_map = {
            '==': operator.eq, '!=': operator.ne,
            '<': operator.lt, '<=': operator.le,
            '>': operator.gt, '>=': operator.ge,
            'AND': lambda a, b: bool(a) and bool(b), # Short-circuiting AND
            'OR': lambda a, b: bool(a) or bool(b),   # Short-circuiting OR
        }

        if node.operator in op_map:
            try:
                return op_map[node.operator](left_val, right_val)
            except TypeError as e:
                raise InterpreterError(f"Type error during operation '{node.operator}' between {left_val} ({type(left_val)}) and {right_val} ({type(right_val)}): {e}")
        else:
            raise InterpreterError(f"Unsupported binary operator: {node.operator}")

    def _evaluate_UnaryOp(self, node: UnaryOp) -> Any:
        """Evaluates a unary operation."""
        operand_val = self._evaluate_expression(node.operand)
        if node.operator == 'NOT':
            return not bool(operand_val)
        else:
            raise InterpreterError(f"Unsupported unary operator: {node.operator}")

    def _evaluate_FunctionCall(self, node: FunctionCall) -> Any:
        """Evaluates a built-in function call like NOW() or print()."""
        if node.function_name == 'NOW':
            if node.arguments:
                 raise InterpreterError("NOW() function does not accept arguments.")
            return time.time()
        elif node.function_name == 'PRINT':
            if len(node.arguments) != 1:
                raise InterpreterError("PRINT() function requires exactly one argument.")
            value_to_print = self._evaluate_expression(node.arguments[0])
            try:
                self.output_handler(value_to_print)
            except Exception as e:
                raise InterpreterError(f"Error during output handler execution: {e}")
            return None
        else:
            raise InterpreterError(f"Unknown built-in function: {node.function_name}")

    def _evaluate_CallExpression(self, node: CallExpression) -> Any:
        """Evaluates a CALL used as an expression (e.g., in LET)."""
        return self._execute_tool_call(node.tool_name, node.arguments)

    def _evaluate_CalcExpression(self, node: CalcExpression) -> Any:
        """Evaluates a CALC expression using the 'simpleeval' library."""
        if simpleeval is None:
            raise InterpreterError("CALC expressions require the 'simpleeval' library, which is not installed.")

        # Evaluate variables used in the formula
        local_vars = {}
        for name, expr in node.variables.items():
            local_vars[name] = self._evaluate_expression(expr)

        try:
            # Create a SimpleEval instance.
            # Pass evaluated variables to the 'names' parameter during initialization.
            s = simpleeval.SimpleEval(
                operators=simpleeval.DEFAULT_OPERATORS,
                functions={}, # Still no functions allowed
                names=local_vars # Pass variables HERE
            )
            # Evaluate the formula (without passing names again)
            result = s.eval(node.formula) # Call eval only with the formula
            return result
        # Catch specific simpleeval errors and general exceptions
        except simpleeval.InvalidExpression as e:
             raise InterpreterError(f"Invalid CALC formula '{node.formula}': {e}")
        except simpleeval.FunctionNotDefined as e:
             # This will catch attempts to use 'str()' or other disallowed functions
             raise InterpreterError(f"Function '{e.func_name}' not allowed in CALC formula '{node.formula}'")
        except simpleeval.NameNotDefined as e:
             # This means a variable used in the formula wasn't provided in 'vars'
             raise InterpreterError(f"Variable '{e.name}' not defined for CALC formula '{node.formula}' (available: {list(local_vars.keys())})")
        except ZeroDivisionError:
            # simpleeval might raise this directly depending on configuration/version
            raise InterpreterError(f"Division by zero in CALC formula '{node.formula}'")
        except Exception as e:
            # Catch other potential evaluation errors
            raise InterpreterError(f"Error evaluating CALC formula '{node.formula}' with vars {local_vars}: {type(e).__name__} - {e}")

    # --- Tool Execution Helper ---

    def _execute_tool_call(self, tool_name: str, arguments: Dict[str, Expression]) -> Any:
        """Helper to evaluate arguments and execute a tool call."""
        if self.tool_registry is None:
            raise InterpreterError("Tool registry not configured.")

        evaluated_args = {}
        for key, expr in arguments.items():
            evaluated_args[key] = self._evaluate_expression(expr)

        # print(f"CALL {tool_name} with args: {evaluated_args}") # Debug print
        try:
            result = self.tool_registry.call_tool(tool_name, evaluated_args)
            return result
        except ToolNotFoundException:
            raise InterpreterError(f"Tool '{tool_name}' not found in the registry.")
        except Exception as e:
            # Catch other potential errors during tool execution
            raise InterpreterError(f"Error executing tool '{tool_name}': {e}")


# --- Helper function for testing (modified OUTSIDE __main__) ---
# Make this helper generally available, not just in __main__
def run_script(script_content: str,
               tool_registry: Optional[ToolRegistry] = None,
               output_handler: Optional[Callable[[Any], None]] = None): # Add handler arg
    """Parses and executes a NuwaScript string.
       Returns the interpreter instance or None on failure.
    """
    # Ensure parser is available if this file is run directly or imported
    # This might be cleaner if parser/lexer are always imported at top level
    try:
        from .parser import parse_script
    except ImportError:
        # Handle case where this might be run directly and relative import fails
        # This indicates a potential structuring issue for direct execution vs import
        print("Error: Cannot import parser. Ensure nuwa package structure is correct.")
        return None

    ast = parse_script(script_content)
    if ast:
        # Pass handler to Interpreter
        interpreter = Interpreter(tool_registry, output_handler=output_handler)
        try:
            interpreter.execute(ast)
            # Keep print statements for debugging when run directly
            if __name__ == "__main__":
                 print("\n--- Final Variables ---")
                 print(interpreter.variables)
            return interpreter
        except InterpreterError as e:
            if __name__ == "__main__":
                 print(f"\n--- Runtime Error ---")
                 print(e)
            else:
                 raise # Re-raise if used as a library function
            return None
        except Exception as e: # Catch unexpected errors
             if __name__ == "__main__":
                  print(f"\n--- Unexpected Execution Error ---")
                  print(e)
             else:
                  raise
             return None
    else:
        if __name__ == "__main__":
             print("Parsing failed, cannot execute.")
        return None


# --- __main__ block: Update MockToolRegistry and example scripts ---
if __name__ == '__main__':
    # Needs ToolSchema etc if run directly
    try:
        import sys # Import sys for sys.exit
        from .tools import ToolRegistry, ToolSchema, ToolParameter, ToolExecutionError
    except ImportError:
         print("Error: Cannot import tools module. Ensure nuwa package structure is correct.")
         sys.exit(1)


    # Define MockToolRegistry WITHOUT reply
    class MockToolRegistry(ToolRegistry):
        def register_defaults(self):
            def _get_price(token: str): return 65000.0 if token == 'BTC' else 0.0
            def _swap(from_token: str, to_token: str, amount: float): return f"tx_{int(time.time()*1000)}" # More unique tx id

            self.register(ToolSchema(
                name="get_price", description="Get price",
                parameters=[ToolParameter("token", "String")],
                returns="Number", callable=_get_price
            ))
            self.register(ToolSchema(
                name="swap", description="Swap tokens",
                parameters=[ToolParameter("from_token", "String"), ToolParameter("to_token", "String"), ToolParameter("amount", "Number")],
                returns="String", callable=_swap
            ))
            # No 'reply' tool registered

    mock_registry = MockToolRegistry()
    mock_registry.register_defaults()

    # Example output handler for testing
    script_outputs = []
    def simple_output_handler(value):
        # Convert value to string for consistent printing/logging if needed
        output_str = str(value)
        print(f"[Script Output] {output_str}")
        script_outputs.append(output_str) # Store string representation

    # Example script using PRINT
    test_script_print = """
    LET btc_price = CALL get_price { token: "BTC" }
    LET threshold = 70000
    IF btc_price < threshold THEN
        LET tx_id = CALL swap { from_token: "USDT", to_token: "BTC", amount: 100 }
        PRINT("Swap executed for BTC.") // Print string literal
        PRINT(tx_id)                   // Print variable (swap result)
    ELSE
        PRINT("Price is too high, no swap.")
        PRINT(btc_price)               // Print variable (price)
    END
    PRINT(NOW())                       // Print result of built-in function
    LET flag = true
    PRINT(flag)                        // Print boolean
    """

    print("\n--- Running Script with Print ---")
    # Use the globally defined run_script helper
    interpreter_instance = run_script(test_script_print, mock_registry, output_handler=simple_output_handler)
    print("\nCaptured script outputs:", script_outputs)

    # Test print error handling (optional)
    print("\n--- Testing Print with Error Handler ---")
    def erroring_handler(value):
        raise ValueError("Output failed!")

    error_script = 'PRINT("This will fail")'
    run_script(error_script, mock_registry, output_handler=erroring_handler) # Should print Runtime Error

    print("\n--- Testing Print with wrong number of args (Parser should catch) ---")
    error_script_args = 'PRINT("Too", "many")' # This should fail parsing
    run_script(error_script_args, mock_registry, output_handler=simple_output_handler)
    error_script_args2 = 'PRINT()' # This should fail parsing too
    run_script(error_script_args2, mock_registry, output_handler=simple_output_handler)


