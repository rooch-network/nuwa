import ply.yacc as yacc

# Get the token map from the lexer. This is required.
from .lexer import tokens, lexer
from .ast import (
    Script, Statement, LetStatement, CallStatement, IfStatement, ForStatement,
    Expression, Literal, Variable, BinaryOp, UnaryOp, FunctionCall,
    CallExpression, CalcExpression
)

# --- Operator Precedence ---
# Define operator precedence and associativity
precedence = (
    ('left', 'OR'),
    ('left', 'AND'),
    ('right', 'NOT'),
    ('nonassoc', 'EQ', 'NE', 'LT', 'LE', 'GT', 'GE'), # Nonassociative: a < b < c is illegal
    # Add precedence for other potential operators like +, -, *, / if CALC is expanded
)

# --- Grammar Rules ---

# Top-level rule: script is a list of statements
def p_script(p):
    '''script : statements'''
    p[0] = Script(statements=p[1])

def p_statements(p):
    '''statements : statements statement
                  | statement'''
    if len(p) == 3:
        p[0] = p[1] + [p[2]] # Append statement to list
    else:
        p[0] = [p[1]] # Start a new list

# Rule for individual statement types
def p_statement(p):
    '''statement : let_statement
                 | call_statement
                 | if_statement
                 | for_statement'''
    p[0] = p[1]

# LET statement: LET ID = expression
def p_let_statement(p):
    '''let_statement : LET ID ASSIGN expression'''
    p[0] = LetStatement(variable_name=p[2], value=p[4])

# CALL statement: CALL ID { arguments }
def p_call_statement(p):
    '''call_statement : CALL ID LBRACE arguments RBRACE'''
    p[0] = CallStatement(tool_name=p[2], arguments=p[4])

# IF statement: IF expression THEN statements [ELSE statements] END
def p_if_statement(p):
    '''if_statement : IF expression THEN statements END
                    | IF expression THEN statements ELSE statements END'''
    if len(p) == 6: # IF ... THEN ... END
        p[0] = IfStatement(condition=p[2], then_block=p[4], else_block=None)
    else: # IF ... THEN ... ELSE ... END
        p[0] = IfStatement(condition=p[2], then_block=p[4], else_block=p[6])

# FOR statement: FOR ID IN expression DO statements END
def p_for_statement(p):
    '''for_statement : FOR ID IN expression DO statements END'''
    p[0] = ForStatement(iterator_variable=p[2], iterable=p[4], loop_block=p[6])

# --- Arguments for CALL and CALC ---

# Arguments: key: value, key: value, ...
def p_arguments(p):
    '''arguments : argument_list
                 | empty'''
    p[0] = p[1] if p[1] is not None else {}

def p_argument_list(p):
    '''argument_list : argument_list COMMA argument
                     | argument'''
    if len(p) == 4:
        p[1][p[3][0]] = p[3][1] # Add key-value pair to dict
        p[0] = p[1]
    else:
        p[0] = {p[1][0]: p[1][1]} # Start a new dict

def p_argument(p):
    '''argument : ID COLON expression'''
    p[0] = (p[1], p[3]) # Return tuple (key, value_expr)

def p_empty(p):
    '''empty :'''
    p[0] = None

# --- Expressions ---

# Base expression rule
def p_expression(p):
    '''expression : binary_op
                  | unary_op
                  | function_call
                  | call_expression
                  | calc_expression
                  | literal
                  | variable
                  | LPAREN expression RPAREN'''
    if len(p) == 2:
        p[0] = p[1] # Simple expression
    else: # Parenthesized expression
        p[0] = p[2]

# Binary operations: expression OP expression
def p_binary_op(p):
    '''binary_op : expression EQ expression
                 | expression NE expression
                 | expression LT expression
                 | expression LE expression
                 | expression GT expression
                 | expression GE expression
                 | expression AND expression
                 | expression OR expression
                 | expression DOT ID ''' # Basic member access

    if p[2] == '==': p[0] = BinaryOp(operator='==', left=p[1], right=p[3])
    elif p[2] == '!=': p[0] = BinaryOp(operator='!=', left=p[1], right=p[3])
    elif p[2] == '<': p[0] = BinaryOp(operator='<', left=p[1], right=p[3])
    elif p[2] == '<=': p[0] = BinaryOp(operator='<=', left=p[1], right=p[3])
    elif p[2] == '>': p[0] = BinaryOp(operator='>', left=p[1], right=p[3])
    elif p[2] == '>=': p[0] = BinaryOp(operator='>=', left=p[1], right=p[3])
    elif p[2].upper() == 'AND': p[0] = BinaryOp(operator='AND', left=p[1], right=p[3])
    elif p[2].upper() == 'OR': p[0] = BinaryOp(operator='OR', left=p[1], right=p[3])
    elif p[2] == '.':
        # This is a simplified member access, assuming left is Variable or similar
        # Might need a dedicated MemberAccess node in AST for proper handling
        if isinstance(p[1], Variable):
             # Represent as Variable with dotted name for now
             p[0] = Variable(name=f"{p[1].name}.{p[3]}")
        else:
             # Handle error or more complex cases later
             print(f"Syntax Error: Cannot access member '{p[3]}' of non-variable {p[1]}")
             p[0] = None # Or raise specific parse error

# Unary operations: NOT expression
def p_unary_op(p):
    '''unary_op : NOT expression'''
    p[0] = UnaryOp(operator='NOT', operand=p[2])

# Built-in function call: NOW()
def p_function_call(p):
    '''function_call : NOW LPAREN RPAREN'''
    p[0] = FunctionCall(function_name='NOW')
    # Add rules for functions with arguments if needed later

# CALL used as expression: CALL ID { arguments }
def p_call_expression(p):
    '''call_expression : CALL ID LBRACE arguments RBRACE'''
    p[0] = CallExpression(tool_name=p[2], arguments=p[4])

# CALC expression: CALC { formula: STRING, vars: { arguments } }
def p_calc_expression(p):
    '''calc_expression : CALC LBRACE calc_args RBRACE'''
    p[0] = CalcExpression(formula=p[3]['formula'], variables=p[3]['vars'])

def p_calc_args(p):
    '''calc_args : ID COLON STRING COMMA ID COLON LBRACE arguments RBRACE'''
    formula_key = p[1]
    vars_key = p[5]
    if formula_key != 'formula':
        raise SyntaxError(f"Expected 'formula' key in CALC block, got '{formula_key}' at line {p.lineno(1)}")
    if vars_key != 'vars':
        raise SyntaxError(f"Expected 'vars' key in CALC block, got '{vars_key}' at line {p.lineno(5)}")

    p[0] = {'formula': p[3], 'vars': p[8]}

# Literal values
def p_literal(p):
    '''literal : NUMBER
               | STRING
               | BOOLEAN'''
               # | NULL # Add if needed
    p[0] = Literal(value=p[1])

# Variable access
def p_variable(p):
    '''variable : ID'''
    p[0] = Variable(name=p[1])

# Error rule for syntax errors
def p_error(p):
    if p:
        print(f"Syntax error at token {p.type} ('{p.value}') on line {p.lineno}")
        # Potentially try to recover or just stop
    else:
        print("Syntax error at EOF")

# Build the parser
parser = yacc.yacc()

# --- Helper function for testing ---
def parse_script(script_content: str) -> Script | None:
    """Parses a NuwaScript string into an AST."""
    # Reset lexer state for each parse
    lexer.lineno = 1
    result = parser.parse(script_content, lexer=lexer)
    return result

if __name__ == '__main__':
    # Example usage for testing
    test_script = """
    LET price = CALL get_price { token: "BTC" }
    LET threshold = 70000
    IF price < threshold AND price > 0 THEN
      LET action = "buy"
      CALL swap { from_token: "USDT", to_token: "BTC", amount: 100 }
    ELSE
      LET action = "wait"
      CALL reply { message: "Price not in range" }
    END

    FOR nft IN listed_nfts DO
        IF nft.rarity > 90 THEN
            CALL buy_nft { id: nft.id, price: nft.price }
        END
    END

    LET current_time = NOW()
    LET estimated_value = CALC {
        formula: "price * 1.1",
        vars: { price: 500 }
     }
    """
    ast = parse_script(test_script)
    if ast:
        import json
        # Crude way to print AST using dataclasses asdict helper
        from dataclasses import asdict

        def default_serializer(obj):
             if dataclasses.is_dataclass(obj):
                 return asdict(obj)
             raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

        # Print a JSON-like representation
        # This will fail if nodes contain non-serializable types directly
        # print(json.dumps(ast, default=default_serializer, indent=2))
        # Safer: just print the structure
        print(ast)


    # Test error case
    error_script = "LET x = 5 IF x > THEN CALL foo END"
    print("\nTesting error case:")
    parse_script(error_script)
