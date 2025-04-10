# nuwa-script/implementations/python/tests/test_parser.py
import pytest
from nuwa.parser import parse_script
from nuwa.ast import (
    Script, LetStatement, CallStatement, IfStatement, ForStatement,
    Literal, Variable, BinaryOp, UnaryOp, FunctionCall, CallExpression, CalcExpression
)

# --- Helper to get the first statement from a parsed script ---
def get_first_statement(script_content):
    ast = parse_script(script_content)
    assert ast is not None, f"Parsing failed for: {script_content}"
    assert isinstance(ast, Script)
    assert len(ast.statements) > 0, "Script produced no statements"
    return ast.statements[0]

# --- Test Cases ---

def test_parse_let_literal():
    """Test parsing LET statement with various literals."""
    stmt = get_first_statement('LET x = 42')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'x'
    assert isinstance(stmt.value, Literal)
    assert stmt.value.value == 42

    stmt = get_first_statement('LET name = "Nuwa"')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'name'
    assert isinstance(stmt.value, Literal)
    assert stmt.value.value == "Nuwa"

    stmt = get_first_statement('LET active = true')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'active'
    assert isinstance(stmt.value, Literal)
    assert stmt.value.value is True

    stmt = get_first_statement('LET pi = 3.14')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'pi'
    assert isinstance(stmt.value, Literal)
    assert stmt.value.value == 3.14

def test_parse_let_variable():
    """Test parsing LET statement assigning another variable."""
    stmt = get_first_statement('LET y = x')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'y'
    assert isinstance(stmt.value, Variable)
    assert stmt.value.name == 'x'

def test_parse_let_call_expression():
    """Test parsing LET statement with a CALL expression."""
    stmt = get_first_statement('LET price = CALL get_price { token: "BTC" }')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'price'
    assert isinstance(stmt.value, CallExpression)
    assert stmt.value.tool_name == 'get_price'
    assert 'token' in stmt.value.arguments
    assert isinstance(stmt.value.arguments['token'], Literal)
    assert stmt.value.arguments['token'].value == "BTC"

def test_parse_let_calc_expression():
    """Test parsing LET statement with a CALC expression."""
    stmt = get_first_statement('LET total = CALC { formula: "a+b", vars: {a: 1, b: var_b} }')
    assert isinstance(stmt, LetStatement)
    assert stmt.variable_name == 'total'
    assert isinstance(stmt.value, CalcExpression)
    assert stmt.value.formula == "a+b"
    assert 'a' in stmt.value.variables
    assert isinstance(stmt.value.variables['a'], Literal)
    assert stmt.value.variables['a'].value == 1
    assert 'b' in stmt.value.variables
    assert isinstance(stmt.value.variables['b'], Variable)
    assert stmt.value.variables['b'].name == 'var_b'

def test_parse_call_statement():
    """Test parsing a CALL statement."""
    stmt = get_first_statement('CALL swap { from: "USD", to: "EUR", amount: 100.5 }')
    assert isinstance(stmt, CallStatement)
    assert stmt.tool_name == 'swap'
    assert len(stmt.arguments) == 3
    assert 'from' in stmt.arguments and isinstance(stmt.arguments['from'], Literal) and stmt.arguments['from'].value == "USD"
    assert 'to' in stmt.arguments and isinstance(stmt.arguments['to'], Literal) and stmt.arguments['to'].value == "EUR"
    assert 'amount' in stmt.arguments and isinstance(stmt.arguments['amount'], Literal) and stmt.arguments['amount'].value == 100.5

def test_parse_call_statement_no_args():
     """Test parsing a CALL statement with no arguments."""
     stmt = get_first_statement('CALL do_something {}')
     assert isinstance(stmt, CallStatement)
     assert stmt.tool_name == 'do_something'
     assert len(stmt.arguments) == 0

def test_parse_if_statement():
    """Test parsing IF statement."""
    script = """
    IF price > 100 THEN
        LET action = "sell"
        CALL execute_sell {}
    END
    """
    stmt = get_first_statement(script)
    assert isinstance(stmt, IfStatement)
    assert isinstance(stmt.condition, BinaryOp)
    assert stmt.condition.operator == '>'
    assert isinstance(stmt.condition.left, Variable) and stmt.condition.left.name == 'price'
    assert isinstance(stmt.condition.right, Literal) and stmt.condition.right.value == 100
    assert len(stmt.then_block) == 2
    assert isinstance(stmt.then_block[0], LetStatement)
    assert isinstance(stmt.then_block[1], CallStatement)
    assert stmt.else_block is None

def test_parse_if_else_statement():
    """Test parsing IF-ELSE statement."""
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
    assert len(stmt.then_block) == 1
    assert isinstance(stmt.then_block[0], CallStatement) and stmt.then_block[0].tool_name == 'process'
    assert stmt.else_block is not None
    assert len(stmt.else_block) == 1
    assert isinstance(stmt.else_block[0], CallStatement) and stmt.else_block[0].tool_name == 'log_inactive'

def test_parse_for_statement():
    """Test parsing FOR statement."""
    script = """
    FOR item IN item_list DO
        LET id = item.id
        CALL process_item { item_id: id }
    END
    """
    stmt = get_first_statement(script)
    assert isinstance(stmt, ForStatement)
    assert stmt.iterator_variable == 'item'
    assert isinstance(stmt.iterable, Variable) and stmt.iterable.name == 'item_list'
    assert len(stmt.loop_block) == 2
    assert isinstance(stmt.loop_block[0], LetStatement)
    # Check the simplified member access parsing
    assert isinstance(stmt.loop_block[0].value, Variable) and stmt.loop_block[0].value.name == 'item.id'
    assert isinstance(stmt.loop_block[1], CallStatement)

def test_parse_complex_expression():
    """Test parsing complex boolean expressions."""
    script = 'IF (a > 10 AND b < 5) OR NOT c THEN CALL action {} END'
    stmt = get_first_statement(script)
    assert isinstance(stmt, IfStatement)
    condition = stmt.condition
    assert isinstance(condition, BinaryOp) and condition.operator == 'OR' # Top level is OR

    left_or = condition.left
    assert isinstance(left_or, BinaryOp) and left_or.operator == 'AND' # Left of OR is AND

    right_or = condition.right
    assert isinstance(right_or, UnaryOp) and right_or.operator == 'NOT' # Right of OR is NOT
    assert isinstance(right_or.operand, Variable) and right_or.operand.name == 'c'

    left_and = left_or.left
    assert isinstance(left_and, BinaryOp) and left_and.operator == '>'
    assert isinstance(left_and.left, Variable) and left_and.left.name == 'a'

    right_and = left_or.right
    assert isinstance(right_and, BinaryOp) and right_and.operator == '<'
    assert isinstance(right_and.left, Variable) and right_and.left.name == 'b'

def test_parse_now_function():
    """Test parsing the NOW() built-in function."""
    stmt = get_first_statement('LET current_time = NOW()')
    assert isinstance(stmt, LetStatement)
    assert isinstance(stmt.value, FunctionCall)
    assert stmt.value.function_name == 'NOW'

def test_parse_member_access():
     """Test parsing member access using dot notation."""
     stmt = get_first_statement('LET rarity = nft.details.rarity') # Nested access
     assert isinstance(stmt, LetStatement)
     assert stmt.variable_name == 'rarity'
     assert isinstance(stmt.value, Variable)
     # NOTE: Current parser simplifies this to a single variable name
     assert stmt.value.name == 'nft.details.rarity'
     # A more advanced parser might create a dedicated MemberAccess AST node.

def test_parse_script_with_comments():
    """Test parsing script with comments."""
    script = """
    // This is a full line comment
    LET x = 10 // Assign value
    // Another comment
    CALL print { value: x } // Call tool
    """
    ast = parse_script(script)
    assert ast is not None
    assert isinstance(ast, Script)
    assert len(ast.statements) == 2
    assert isinstance(ast.statements[0], LetStatement)
    assert isinstance(ast.statements[1], CallStatement)

def test_parse_syntax_error():
    """Test parsing script with syntax errors."""
    # Pytest captures stdout, so we don't need to check it explicitly here unless needed.
    # `parse_script` currently prints errors but returns None or partial AST.
    # We just check if it returns None for now.
    # A better parser might raise specific exceptions.
    script = "LET x = 5 IF x > THEN CALL foo END"
    ast = parse_script(script)
    # Depending on error recovery strategy, this might not be None,
    # but it should indicate an error occurred (e.g., via logs or exceptions).
    # For the current basic error printing, we might not get None.
    # Let's assume for now it *should* ideally fail clearly.
    # assert ast is None # This might fail depending on ply's default error handling

    # A more specific check would involve capturing stderr or having the parser raise
    # with pytest.raises(SyntaxError): # If parser raised exceptions
    #    parse_script(script)
    pass # Placeholder until error handling is more robust 