import time
import operator
from typing import Any, Dict, List, Optional

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
    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        """
        Initializes the interpreter.

        Args:
            tool_registry: An optional ToolRegistry instance to handle CALLs.
        """
        self.variables: Dict[str, Any] = {} # Global variable scope for now
        self.tool_registry = tool_registry if tool_registry else ToolRegistry() # Use a default empty registry if none provided

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
        """Evaluates a variable by looking it up."""
        # Handle basic member access (e.g., 'nft.rarity') parsed as 'nft.rarity' Variable
        if '.' in node.name:
            parts = node.name.split('.', 1)
            base_var_name = parts[0]
            member_name = parts[1]
            if base_var_name in self.variables:
                base_value = self.variables[base_var_name]
                # Assuming base_value is a dict-like object for member access
                if isinstance(base_value, dict) and member_name in base_value:
                    return base_value[member_name]
                else:
                    # Add support for object attribute access if needed later
                    raise InterpreterError(f"Cannot access member '{member_name}' on variable '{base_var_name}' (value: {base_value})")
            else:
                raise InterpreterError(f"Variable '{base_var_name}' not found for member access")
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
        """Evaluates a built-in function call."""
        if node.function_name == 'NOW':
            # For simplicity, return Unix timestamp as float
            return time.time()
        else:
            raise InterpreterError(f"Unknown built-in function: {node.function_name}")

    def _evaluate_CallExpression(self, node: CallExpression) -> Any:
        """Evaluates a CALL used as an expression (e.g., in LET)."""
        return self._execute_tool_call(node.tool_name, node.arguments)

    def _evaluate_CalcExpression(self, node: CalcExpression) -> Any:
        """Evaluates a CALC expression."""
        # Evaluate variables used in the formula
        local_vars = {}
        for name, expr in node.variables.items():
            local_vars[name] = self._evaluate_expression(expr)

        # VERY basic and UNSAFE formula evaluation using eval().
        # Replace with a safe math expression evaluator library (e.g., numexpr, simpleeval)
        # for any real-world use.
        try:
            # WARNING: eval() is dangerous with untrusted input!
            # We only pass evaluated local_vars, not the global scope.
            result = eval(node.formula, {"__builtins__": {}}, local_vars)
            return result
        except Exception as e:
            raise InterpreterError(f"Error evaluating CALC formula '{node.formula}' with vars {local_vars}: {e}")


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


# --- Helper function for testing ---
def run_script(script_content: str, tool_registry: Optional[ToolRegistry] = None):
    """Parses and executes a NuwaScript string."""
    from .parser import parse_script # Local import for testing
    from .tools import ToolRegistry # Ensure ToolRegistry is available for the mock
    ast = parse_script(script_content)
    if ast:
        interpreter = Interpreter(tool_registry)
        try:
            interpreter.execute(ast)
            print("\n--- Final Variables ---")
            print(interpreter.variables)
            return interpreter # Return interpreter to inspect state if needed
        except InterpreterError as e:
            print(f"\n--- Runtime Error ---")
            print(e)
            return None
    else:
        print("Parsing failed, cannot execute.")
        return None

if __name__ == '__main__':
    # Example usage for testing
    # Define a simple mock tool registry for testing
    from .tools import ToolRegistry, ToolNotFoundException # Need these for the mock

    class MockToolRegistry(ToolRegistry):
        def call_tool(self, tool_name: str, args: Dict[str, Any]) -> Any:
            print(f"[Tool Call] {tool_name}({args})")
            if tool_name == "get_price":
                if args.get("token") == "BTC": return 65000
                if args.get("token") == "ETH": return 3500
                return None # Unknown token
            elif tool_name == "swap":
                # Simulate a swap, maybe return a transaction ID
                return f"swap_tx_{int(time.time())}"
            elif tool_name == "reply":
                # Just print the reply message
                print(f"Reply sent: {args.get('message')}")
                return True # Indicate success
            elif tool_name == "get_nfts":
                # Return a list of dicts for the FOR loop test
                return [
                    {'id': 'nft1', 'rarity': 85, 'price': 1.5},
                    {'id': 'nft2', 'rarity': 95, 'price': 2.5},
                    {'id': 'nft3', 'rarity': 91, 'price': 2.1},
                ]
            elif tool_name == "buy_nft":
                print(f"Attempting to buy NFT {args.get('id')} for {args.get('price')}")
                return True # Simulate successful purchase
            else:
                raise ToolNotFoundException(tool_name)

    mock_registry = MockToolRegistry()

    test_script_1 = """
    LET btc_price = CALL get_price { token: "BTC" }
    LET eth_price = CALL get_price { token: "ETH" }
    LET threshold = 60000
    LET amount_to_swap = 100

    IF btc_price < threshold OR eth_price < 3000 THEN
        LET action = "swap_btc"
        // LET tx_id = CALL swap { ... } // Simplified: CALL directly for now
        CALL swap {
            from_token: "USDT",
            to_token: "BTC",
            amount: amount_to_swap
        }
        // CALL reply { message: "Swapped for BTC, tx: " + tx_id } // Requires CALC/concat
        CALL reply { message: "Swapped for BTC"}
    ELSE
        LET action = "wait"
        CALL reply { message: "Prices too high." }
    END

    LET current_time = NOW() // Test built-in function
    """

    simple_script_2 = """
    LET listed_nfts = CALL get_nfts {}
    LET bought_count = 0
    LET high_rarity_threshold = 90

    FOR nft IN listed_nfts DO
        IF nft.rarity > high_rarity_threshold THEN
            CALL buy_nft { id: nft.id, price: nft.price }
            // LET bought_count = bought_count + 1 // Requires CALC or enhanced binary ops
        END
    END
    CALL reply { message: "Finished checking NFTs." } // Simplified message
    """

    test_script_calc = """
    LET base_price = 500
    LET tax_rate = 0.1
    LET final_price = CALC {
        formula: "base_price * (1 + tax_rate)",
        vars: { base_price: base_price, tax_rate: tax_rate }
    }
    """


    print("--- Running Script 1 (Simplified) ---")
    run_script(test_script_1, mock_registry)

    print("\n--- Running Simplified Script 2 ---")
    run_script(simple_script_2, mock_registry)

    print("\n--- Running Script CALC --- ")
    run_script(test_script_calc, mock_registry)


