# nuwa-script/implementations/python/tests/test_parser.py
import pytest
from nuwa.parser import parse_script
from nuwa.ast import (
    Script, LetStatement, CallStatement, IfStatement, ForStatement,
    Literal, Variable, BinaryOp, UnaryOp, FunctionCall, CallExpression, CalcExpression
)

# --- Helper to get the first statement from a parsed script ---
def get_first_statement(script_content):
    # Parse the script as-is (respecting case for identifiers)
    ast = parse_script(script_content)
    assert ast is not None, f"Parsing failed for: {script_content}"
    assert isinstance(ast, Script)
    assert len(ast.statements) > 0, "Script produced no statements"
    return ast.statements[0]

# --- Test Cases (Keywords/Booleans UPPERCASE, Identifiers keep case) ---

def test_parse_let_literal():
    stmt = get_first_statement('LET x = 42')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'x'
    assert isinstance(stmt.value, Literal) and stmt.value.value == 42

    stmt = get_first_statement('LET name = "Nuwa"')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'name'
    assert isinstance(stmt.value, Literal) and stmt.value.value == "Nuwa"

    stmt = get_first_statement('LET isActive = TRUE')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'isActive'
    assert isinstance(stmt.value, Literal) and stmt.value.value is True

    stmt = get_first_statement('LET PI = 3.14') # Keep uppercase if desired
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'PI'
    assert isinstance(stmt.value, Literal) and stmt.value.value == 3.14

def test_parse_let_variable():
    stmt = get_first_statement('LET y = x')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'y'
    assert isinstance(stmt.value, Variable) and stmt.value.name == 'x'

def test_parse_let_call_expression():
    stmt = get_first_statement('LET price = CALL get_price { token: "BTC" }')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'price'
    assert isinstance(stmt.value, CallExpression) and stmt.value.tool_name == 'get_price' # Tool names are identifiers
    assert isinstance(stmt.value.arguments['token'], Literal)

def test_parse_let_calc_expression():
    stmt = get_first_statement('LET total = CALC { formula: "a+b", vars: {a: 1, b: varB} }')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'total'
    assert isinstance(stmt.value, CalcExpression) and stmt.value.formula == "a+b"
    assert isinstance(stmt.value.variables['a'], Literal)
    assert isinstance(stmt.value.variables['b'], Variable) and stmt.value.variables['b'].name == 'varB'

def test_parse_call_statement():
    stmt = get_first_statement('CALL swap_tool { from: "USD", to: "EUR", amount: 100.5 }')
    assert isinstance(stmt, CallStatement) and stmt.tool_name == 'swap_tool'
    assert len(stmt.arguments) == 3
    assert isinstance(stmt.arguments['from'], Literal)

def test_parse_call_statement_no_args():
     stmt = get_first_statement('CALL doSomething {}')
     assert isinstance(stmt, CallStatement) and stmt.tool_name == 'doSomething'
     assert len(stmt.arguments) == 0

def test_parse_if_statement():
    script = """
    IF price > 100 THEN
        LET action = "sell"
        CALL execute_sell {}
    END
    """
    stmt = get_first_statement(script)
    assert isinstance(stmt, IfStatement)
    assert isinstance(stmt.condition, BinaryOp) and stmt.condition.operator == '>'
    assert isinstance(stmt.condition.left, Variable) and stmt.condition.left.name == 'price'
    assert isinstance(stmt.condition.right, Literal) and stmt.condition.right.value == 100
    assert len(stmt.then_block) == 2
    assert isinstance(stmt.then_block[0], LetStatement) and stmt.then_block[0].variable_name == 'action'
    assert isinstance(stmt.then_block[1], CallStatement) and stmt.then_block[1].tool_name == 'execute_sell'
    assert stmt.else_block is None

def test_parse_if_else_statement():
    script = """
    IF status == "active" THEN
        CALL process {}
    ELSE
        CALL log_inactive {}
    END
    """
    stmt = get_first_statement(script)
    assert isinstance(stmt, IfStatement)
    assert isinstance(stmt.condition, BinaryOp) and stmt.condition.operator == '=='
    assert isinstance(stmt.condition.left, Variable) and stmt.condition.left.name == 'status'
    assert len(stmt.then_block) == 1
    assert isinstance(stmt.then_block[0], CallStatement) and stmt.then_block[0].tool_name == 'process'
    assert stmt.else_block is not None and len(stmt.else_block) == 1
    assert isinstance(stmt.else_block[0], CallStatement) and stmt.else_block[0].tool_name == 'log_inactive'

def test_parse_for_statement():
    script = """
    FOR item IN itemList DO
        LET id = item.id
        CALL process_item { item_id: id }
    END
    """
    stmt = get_first_statement(script)
    assert isinstance(stmt, ForStatement) and stmt.iterator_variable == 'item'
    assert isinstance(stmt.iterable, Variable) and stmt.iterable.name == 'itemList'
    assert len(stmt.loop_block) == 2
    assert isinstance(stmt.loop_block[0], LetStatement) and stmt.loop_block[0].variable_name == 'id'
    assert isinstance(stmt.loop_block[0].value, Variable) and stmt.loop_block[0].value.name == 'item.id' # Member access treated as Variable name
    assert isinstance(stmt.loop_block[1], CallStatement) and stmt.loop_block[1].tool_name == 'process_item'

def test_parse_complex_expression():
    script = 'IF (price > 10 AND volume < 5) OR NOT isStable THEN CALL perform_action {} END'
    stmt = get_first_statement(script)
    assert isinstance(stmt, IfStatement)
    condition = stmt.condition
    assert isinstance(condition, BinaryOp) and condition.operator == 'OR'
    left_or = condition.left
    assert isinstance(left_or, BinaryOp) and left_or.operator == 'AND'
    assert isinstance(left_or.left.left, Variable) and left_or.left.left.name == 'price' # Access nested parts
    right_or = condition.right
    assert isinstance(right_or, UnaryOp) and right_or.operator == 'NOT'
    assert isinstance(right_or.operand, Variable) and right_or.operand.name == 'isStable'

def test_parse_now_function():
    stmt = get_first_statement('LET currentTime = NOW()')
    assert isinstance(stmt, LetStatement) and stmt.variable_name == 'currentTime'
    assert isinstance(stmt.value, FunctionCall) and stmt.value.function_name == 'NOW'

def test_parse_print_function():
    stmt = get_first_statement('PRINT("Hello World")')
    assert isinstance(stmt, FunctionCall) and stmt.function_name == 'PRINT'
    assert len(stmt.arguments) == 1 and isinstance(stmt.arguments[0], Literal) and stmt.arguments[0].value == "Hello World"

def test_parse_member_access():
     stmt = get_first_statement('LET rarityValue = NftData.details.rarity')
     assert isinstance(stmt, LetStatement) and stmt.variable_name == 'rarityValue'
     assert isinstance(stmt.value, Variable) and stmt.value.name == 'NftData.details.rarity' # Full path as name

def test_parse_script_with_comments():
    script = """
    // This is a full line comment
    LET x = 10 // Assign value
    // Another comment
    CALL print_value { value: x } // Call tool
    """
    # Parse script respecting case
    ast = parse_script(script)
    assert ast is not None and isinstance(ast, Script) and len(ast.statements) == 2
    assert isinstance(ast.statements[0], LetStatement) and ast.statements[0].variable_name == 'x'
    assert isinstance(ast.statements[1], CallStatement) and ast.statements[1].tool_name == 'print_value'

def test_parse_syntax_error():
    # Error test remains valid, doesn't rely on case
    script = "LET x = 5 IF x > THEN CALL foo {} END" # Syntax error
    ast = parse_script(script)
    assert ast is None # Parser should return None on syntax error

# Test case sensitivity explicitly
def test_parse_case_sensitivity():
     stmt_lower = get_first_statement('LET myvar = 1')
     stmt_upper = get_first_statement('LET MYVAR = 2')
     assert stmt_lower.variable_name == 'myvar'
     assert stmt_upper.variable_name == 'MYVAR'

     stmt_mixed = get_first_statement('LET itemValue = item.VALUE')
     assert stmt_mixed.variable_name == 'itemValue'
     assert isinstance(stmt_mixed.value, Variable) and stmt_mixed.value.name == 'item.VALUE'

# Test keywords must be uppercase
def test_keywords_must_be_uppercase():
    script_lower_let = "let x = 5"
    ast = parse_script(script_lower_let)
    assert ast is None, "Lowercase 'let' should fail parsing"

    script_lower_if = "IF x > 5 then CALL y {} END"
    ast = parse_script(script_lower_if)
    assert ast is None, "Lowercase 'then' should fail parsing"

    script_lower_true = "LET flag = true" # Lowercase 'true'
    ast = parse_script(script_lower_true)
    assert ast is not None, "Parsing should succeed with lowercase 'true' as ID"
    assert len(ast.statements) == 1
    stmt = ast.statements[0]
    assert isinstance(stmt, LetStatement), "Should be a LET statement"
    assert stmt.variable_name == 'flag', "Variable name should be 'flag'"
    # Value should be Variable('true'), not Literal(True)
    assert isinstance(stmt.value, Variable), "Value type should be Variable for 'true'"
    assert stmt.value.name == 'true', "Variable name should be 'true'"
    assert not (isinstance(stmt.value, Literal) and stmt.value.value is True)

    script_lower_false = "LET flag = false" # Lowercase 'false'
    ast = parse_script(script_lower_false)
    assert ast is not None, "Parsing should succeed with lowercase 'false' as ID"
    assert len(ast.statements) == 1
    stmt = ast.statements[0]
    assert isinstance(stmt, LetStatement), "Should be a LET statement"
    assert stmt.variable_name == 'flag', "Variable name should be 'flag'"
    # Value should be Variable('false'), not Literal(False)
    assert isinstance(stmt.value, Variable), "Value type should be Variable for 'false'"
    assert stmt.value.name == 'false', "Variable name should be 'false'"
    assert not (isinstance(stmt.value, Literal) and stmt.value.value is False)
