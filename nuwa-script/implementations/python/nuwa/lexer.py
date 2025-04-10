import ply.lex as lex

# List of token names. This is always required.
tokens = (
    'LET', 'CALL', 'IF', 'THEN', 'ELSE', 'END', 'FOR', 'IN', 'DO', 'CALC',
    'PRINT', 'NOW',
    'ID', 'NUMBER', 'STRING', 'BOOLEAN', # Ensure BOOLEAN type exists
    'ASSIGN', 'EQ', 'NE', 'GT', 'LT', 'GE', 'LE',
    'AND', 'OR', 'NOT',
    'LBRACE', 'RBRACE', 'LPAREN', 'RPAREN', 'COLON', 'COMMA', 'DOT',
)

# Reserved words - UPPERCASE only
reserved = {
    'LET': 'LET',
    'CALL': 'CALL',
    'IF': 'IF',
    'THEN': 'THEN',
    'ELSE': 'ELSE',
    'END': 'END',
    'FOR': 'FOR',
    'IN': 'IN',
    'DO': 'DO',
    'CALC': 'CALC',
    'PRINT': 'PRINT',
    'AND': 'AND',
    'OR': 'OR',
    'NOT': 'NOT',
    'NOW': 'NOW',
    'TRUE': 'BOOLEAN', # Use uppercase TRUE
    'FALSE': 'BOOLEAN', # Use uppercase FALSE
}

# Regular expression rules for simple tokens
t_ASSIGN = r'='
t_EQ = r'=='
t_NE = r'!='
t_GT = r'>'
t_LT = r'<'
t_GE = r'>='
t_LE = r'<='
t_LBRACE = r'{'
t_RBRACE = r'}'
t_LPAREN = r'\('
t_RPAREN = r'\)'
t_COLON = r':'
t_COMMA = r','
t_DOT = r'\.'

# A regular expression rule with some action code
# We need to handle potential floats and integers
def t_NUMBER(t):
    r'\d+(\.\d+)?'
    if '.' in t.value:
        t.value = float(t.value)
    else:
        t.value = int(t.value)
    return t

# Define a rule so we can track line numbers
def t_newline(t):
    r'\n+'
    t.lexer.lineno += len(t.value)

# A string containing ignored characters (spaces and tabs)
t_ignore = ' \t'

# Comments (ignore everything after // until newline)
t_ignore_COMMENT = r'//.*'

# Rule for identifiers and reserved words
def t_ID(t):
    r'[a-zA-Z_][a-zA-Z_0-9]*'
    # Check reserved words using the original value.
    # Only uppercase versions are in 'reserved', so lowercase stays ID.
    t.type = reserved.get(t.value, 'ID')

    # If it was identified as a BOOLEAN token (t.value was 'TRUE' or 'FALSE')
    # convert the value to a Python boolean.
    if t.type == 'BOOLEAN':
        t.value = (t.value == 'TRUE')

    return t

# Rule for string literals (handling escaped quotes)
def t_STRING(t):
    r'\"([^\\\"]|\\.)*\"'
    # Remove the outer quotes and handle escape sequences
    t.value = t.value[1:-1].encode().decode('unicode_escape')
    return t

# Error handling rule
def t_error(t):
    print(f"Illegal character '{t.value[0]}' at line {t.lexer.lineno}")
    t.lexer.skip(1)

# Build the lexer
lexer = lex.lex()

# --- Helper function for testing ---
def tokenize_script(script_content: str):
    """Tokenizes a NuwaScript string."""
    lexer.input(script_content)
    tokens_list = []
    while True:
        tok = lexer.token()
        if not tok:
            break  # No more input
        tokens_list.append(tok)
    return tokens_list

if __name__ == '__main__':
    # Helper function needs to be defined here if not imported
    def tokenize_script(script_content: str):
        lexer.input(script_content)
        tokens_list = []
        while True:
            tok = lexer.token()
            if not tok:
                break
            tokens_list.append(tok)
        return tokens_list

    test_script_upper = """
    LET PRICE = CALL GET_PRICE { token: "BTC" } // All caps
    LET THRESHOLD = 70000.5
    IF PRICE < THRESHOLD AND NOT (PRICE == 0) THEN
        PRINT("Condition met!")
        LET SUCCESS = TRUE     // Uppercase boolean
    ELSE
        PRINT("Price too high or zero.")
        LET SUCCESS = FALSE    // Uppercase boolean
    END
    LET CURRENT_TIME = NOW()
    """

    tokens_found = tokenize_script(test_script_upper)
    print("\n--- Lexer Test Output (Case Sensitive - UPPERCASE) ---")
    for token in tokens_found:
        print(token)

    # Test case with lowercase keyword - should be treated as ID
    test_script_lower = """
    let price = 100
    """
    tokens_lower = tokenize_script(test_script_lower)
    print("\n--- Lexer Test Output (Lowercase Keyword as ID) ---")
    for token in tokens_lower:
        print(token) # Expecting: LexToken(ID,'let',...), LexToken(ID,'price',...), ...
