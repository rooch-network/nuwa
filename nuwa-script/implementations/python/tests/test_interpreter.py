# nuwa-script/implementations/python/tests/test_interpreter.py
import pytest
import time
from typing import Any, Dict

from nuwa.parser import parse_script
from nuwa.interpreter import Interpreter, InterpreterError
from nuwa.tools import ToolRegistry, ToolNotFoundException, ToolExecutionError, ToolParameter, ToolSchema
from nuwa.ast import Script

# --- Updated Mock Tools (No Reply, with Logging) ---

class MockToolRegistry(ToolRegistry):
    """A mock registry for testing interpreter tool calls."""
    def __init__(self):
        super().__init__()
        self.call_log = []

    # Define tool logic as methods to access self.call_log
    def _get_data(self, key: str):
        self.call_log.append(("get_data", {"key": key}))
        return {"config_a": 123}.get(key)

    def _process(self, value: Any, mode: str = "default"):
        self.call_log.append(("process", {"value": value, "mode": mode}))
        print(f"Processing {value} ({mode})") # Keep stdout for debugging if needed

    def _get_list(self):
        self.call_log.append(("get_list", {}))
        return [{"id": 1, "val": 10}, {"id": 2, "val": 20}] # Adjusted val for test

    def _check_item(self, item_id: int):
        self.call_log.append(("check_item", {"item_id": item_id}))
        return item_id % 2 == 0

    def _tool_that_errors(self):
        self.call_log.append(("tool_that_errors", {}))
        raise ValueError("Failed")

    def _identity(self, arg: Any):
        self.call_log.append(("identity", {"arg": arg}))
        return arg

    def register_defaults(self):
        """Register mock tools using ToolSchema, referencing instance methods."""
        self.register(ToolSchema(
            name="get_data", description="Get data",
            parameters=[ToolParameter(name="key", type="String")],
            returns="Any", callable=self._get_data # Reference method
        ))
        self.register(ToolSchema(
            name="process", description="Process value",
            parameters=[ToolParameter(name="value", type="Any"), ToolParameter(name="mode", type="String", required=False)],
            returns="Boolean", callable=self._process # Reference method
        ))
        self.register(ToolSchema(name="get_list", description="Get list", parameters=[], returns="List[Object]", callable=self._get_list)) # Ref method
        self.register(ToolSchema(name="check_item", description="Check item", parameters=[ToolParameter(name="item_id", type="Number")], returns="Boolean", callable=self._check_item)) # Ref method
        self.register(ToolSchema(name="tool_that_errors", description="Fails", parameters=[], returns="Never", callable=self._tool_that_errors)) # Ref method
        self.register(ToolSchema(name="identity", description="Identity", parameters=[ToolParameter(name="arg", type="Any")], returns="Any", callable=self._identity)) # Ref method


# --- Pytest Fixture ---

@pytest.fixture
def interpreter_with_mock_tools():
    """Provides an Interpreter instance with mock tools registered."""
    registry = MockToolRegistry()
    registry.register_defaults()
    interpreter = Interpreter(tool_registry=registry)
    interpreter.mock_registry = registry
    return interpreter

# --- Helper to Run Script ---
def run_test_script(interpreter: Interpreter, script_content: str, output_handler=None):
    """Parses and executes a script using the provided interpreter."""
    ast = parse_script(script_content)
    assert ast is not None and isinstance(ast, Script), f"Parsing failed for script: {script_content}"
    # Update interpreter's handler if provided for this run
    if output_handler:
        interpreter.output_handler = output_handler
    interpreter.execute(ast)


# --- Test Cases (Keywords/Booleans UPPERCASE, Identifiers keep case) ---

def test_interpreter_let_literal(interpreter_with_mock_tools):
    """Test LET assignments with literals."""
    script = """
    LET count = 10
    LET name = "test"
    LET flag = FALSE
    LET pi = 3.14159
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['count'] == 10
    assert interpreter_with_mock_tools.variables['name'] == "test"
    assert interpreter_with_mock_tools.variables['flag'] is False
    assert interpreter_with_mock_tools.variables['pi'] == 3.14159

def test_interpreter_let_variable(interpreter_with_mock_tools):
    """Test LET assignment from another variable."""
    script = """
    LET x = 100
    LET y = x
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['y'] == 100

def test_interpreter_let_call_expression(interpreter_with_mock_tools):
    """Test LET assignment from a CALL expression."""
    script = 'LET result = CALL get_data { key: "config_a" }'
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['result'] == 123
    assert interpreter_with_mock_tools.mock_registry.call_log == [("get_data", {"key": "config_a"})]

def test_interpreter_call_statement(interpreter_with_mock_tools):
    """Test CALL statement execution."""
    script = """
    LET inputVal = 42
    CALL process { value: inputVal, mode: "special" }
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.mock_registry.call_log == [("process", {"value": 42, "mode": "special"})]

def test_interpreter_binary_ops(interpreter_with_mock_tools):
    """Test evaluation of binary operations."""
    script = """
    LET a = 10
    LET b = 5
    LET c = 10
    LET resGt = a > b
    LET resLt = b < a
    LET resGe = a >= c
    LET resLe = b <= a
    LET resEq = a == c
    LET resNe = a != b
    LET flagT = TRUE
    LET flagF = FALSE
    LET resAnd = flagT AND (a > b)
    LET resOr = flagF OR (b == 5)
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['resGt'] is True
    assert interpreter_with_mock_tools.variables['resLt'] is True
    assert interpreter_with_mock_tools.variables['resGe'] is True
    assert interpreter_with_mock_tools.variables['resLe'] is True
    assert interpreter_with_mock_tools.variables['resEq'] is True
    assert interpreter_with_mock_tools.variables['resNe'] is True
    assert interpreter_with_mock_tools.variables['resAnd'] is True
    assert interpreter_with_mock_tools.variables['resOr'] is True

def test_interpreter_unary_ops(interpreter_with_mock_tools):
    """Test evaluation of unary operations."""
    script = """
    LET isActive = TRUE
    LET isInactive = FALSE
    LET resNotT = NOT isActive
    LET resNotF = NOT isInactive
    LET resNotNum = NOT 10
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['resNotT'] is False
    assert interpreter_with_mock_tools.variables['resNotF'] is True
    assert interpreter_with_mock_tools.variables['resNotNum'] is False

def test_interpreter_if_then(interpreter_with_mock_tools):
    """Test IF statement (THEN branch)."""
    script = """
    LET condition = TRUE
    LET result = "not set"
    IF condition THEN
        CALL process { value: 1 }
        LET result = "then branch"
    ELSE
        CALL process { value: 0 }
        LET result = "else branch"
    END
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['result'] == "then branch"
    assert interpreter_with_mock_tools.mock_registry.call_log == [("process", {"value": 1, "mode": "default"})]

def test_interpreter_if_else(interpreter_with_mock_tools):
    """Test IF statement (ELSE branch)."""
    script = """
    LET condition = FALSE
    LET result = "not set"
    IF condition THEN
        CALL process { value: 1 }
        LET result = "then branch"
    ELSE
        CALL process { value: 0 }
        LET result = "else branch"
    END
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['result'] == "else branch"
    assert interpreter_with_mock_tools.mock_registry.call_log == [("process", {"value": 0, "mode": "default"})]

def test_interpreter_for_loop(interpreter_with_mock_tools):
    """Test FOR loop execution."""
    simplified_script = """
    LET items = CALL get_list {}
    FOR item IN items DO
        LET currentId = item.id
        LET shouldCheck = TRUE
        IF shouldCheck THEN
             CALL check_item { item_id: currentId }
        END
    END
    """
    run_test_script(interpreter_with_mock_tools, simplified_script)
    assert interpreter_with_mock_tools.mock_registry.call_log[0] == ("get_list", {})
    assert ("check_item", {"item_id": 1}) in interpreter_with_mock_tools.mock_registry.call_log
    assert ("check_item", {"item_id": 2}) in interpreter_with_mock_tools.mock_registry.call_log
    assert 'item' not in interpreter_with_mock_tools.variables

def test_interpreter_now_function(interpreter_with_mock_tools):
    """Test the NOW() built-in function."""
    start_time = time.time()
    script = "LET t1 = NOW()"
    run_test_script(interpreter_with_mock_tools, script)
    end_time = time.time()
    assert 't1' in interpreter_with_mock_tools.variables
    assert start_time <= interpreter_with_mock_tools.variables['t1'] <= end_time

def test_interpreter_calc_expression(interpreter_with_mock_tools):
    """Test basic CALC expression."""
    script = """
    LET x = 10
    LET y = 20
    LET result = CALC { formula: "x * y + 5", vars: { x: x, y: y } }
    """
    run_test_script(interpreter_with_mock_tools, script)
    assert interpreter_with_mock_tools.variables['result'] == 205

def test_interpreter_member_access(interpreter_with_mock_tools):
    """Test member access on variables."""
    interpreter_with_mock_tools.variables['dataStruct'] = {"value": 99, "nested": {"level": 1}}
    script_simple = 'LET val = dataStruct.value'
    run_test_script(interpreter_with_mock_tools, script_simple)
    assert interpreter_with_mock_tools.variables['val'] == 99

    script_nested = 'LET nestedLevel = dataStruct.nested.level'
    run_test_script(interpreter_with_mock_tools, script_nested)
    assert interpreter_with_mock_tools.variables['nestedLevel'] == 1

# --- Error Handling Tests (Keywords/Booleans UPPERCASE, Identifiers keep case) ---

def test_interpreter_undefined_variable(interpreter_with_mock_tools):
    """Test accessing an undefined variable."""
    script = "LET y = x"
    with pytest.raises(InterpreterError, match="Variable 'x' not defined"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_type_error_op(interpreter_with_mock_tools):
    """Test binary operation with incompatible types."""
    script = 'LET result = 5 > "hello"'
    with pytest.raises(InterpreterError, match="Type error during operation '>'"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_if_non_boolean(interpreter_with_mock_tools):
    """Test IF condition evaluating to non-boolean."""
    script = 'IF 10 THEN CALL process { value: 1} END'
    with pytest.raises(InterpreterError, match="IF condition did not evaluate to a boolean"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_for_non_list(interpreter_with_mock_tools):
    """Test FOR loop on a non-list iterable."""
    script = """
    LET items = 123
    FOR item IN items DO
        CALL process { value: item }
    END
    """
    with pytest.raises(InterpreterError, match="FOR loop expected an iterable list"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_tool_not_found(interpreter_with_mock_tools):
    """Test calling a tool that is not registered."""
    script = 'CALL unknown_tool {}'
    with pytest.raises(InterpreterError, match="Tool 'unknown_tool' not found"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_tool_execution_error(interpreter_with_mock_tools):
    """Test calling a tool that raises an exception during execution."""
    script = 'CALL tool_that_errors {}'
    with pytest.raises(InterpreterError, match="Error executing tool 'tool_that_errors'"):
        run_test_script(interpreter_with_mock_tools, script)

def test_interpreter_calc_error(interpreter_with_mock_tools):
    """Test CALC expression with a evaluation error (division by zero)."""
    script = """
    LET x = 1
    LET result = CALC { formula: "x / 0", vars: { x: x } }
    """
    with pytest.raises(InterpreterError, match="Division by zero"):
        run_test_script(interpreter_with_mock_tools, script)

# --- Print tests (Keywords/Booleans UPPERCASE, Identifiers keep case) ---

def test_interpreter_print_literal(interpreter_with_mock_tools):
    """Test print() function with literals."""
    outputs = []
    handler = lambda v: outputs.append(v)
    script = """
    PRINT("Hello")
    PRINT(123)
    PRINT(TRUE)
    """
    run_test_script(interpreter_with_mock_tools, script, output_handler=handler)
    assert outputs == ["Hello", 123, True]

def test_interpreter_print_variable(interpreter_with_mock_tools):
    """Test print() function with variables."""
    outputs = []
    handler = lambda v: outputs.append(v)
    script = """
    LET msg = "Data"
    LET count = 42
    PRINT(msg)
    PRINT(count)
    """
    run_test_script(interpreter_with_mock_tools, script, output_handler=handler)
    assert outputs == ["Data", 42]
    assert interpreter_with_mock_tools.variables['msg'] == "Data"
    assert interpreter_with_mock_tools.variables['count'] == 42

def test_interpreter_print_expression(interpreter_with_mock_tools):
    """Test print() function with expression results."""
    outputs = []
    handler = lambda v: outputs.append(v)
    def _get_price(token: str): return 65000.0
    interpreter_with_mock_tools.tool_registry.register(ToolSchema(
        name="get_price", description="Get price",
        parameters=[ToolParameter("token", "String")],
        returns="Number", callable=_get_price
    ))

    script = """
    LET price = CALL get_price { token: "BTC" }
    PRINT(price > 60000)
    PRINT(NOW())
    """
    start_time = time.time()
    run_test_script(interpreter_with_mock_tools, script, output_handler=handler)
    end_time = time.time()

    assert len(outputs) == 2
    assert outputs[0] is True
    assert isinstance(outputs[1], float)
    assert start_time <= outputs[1] <= end_time

def test_interpreter_print_handler_error(interpreter_with_mock_tools):
    """Test error propagation from the output handler."""
    def failing_handler(value):
        raise RuntimeError("Handler failed")

    script = 'PRINT("Test")'
    with pytest.raises(InterpreterError, match="Error during output handler execution: Handler failed"):
        run_test_script(interpreter_with_mock_tools, script, output_handler=failing_handler)

def test_interpreter_print_wrong_args(interpreter_with_mock_tools):
    """Test print() called with incorrect number of arguments (should fail parsing)."""
    script_too_many = 'PRINT("a", "b")'
    ast_too_many = parse_script(script_too_many)
    assert ast_too_many is None

    script_none = 'PRINT()'
    ast_none = parse_script(script_none)
    assert ast_none is None 