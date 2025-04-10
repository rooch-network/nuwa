import ply.lex as lex

# List of token names. This is always required.
tokens = (
    'LET', 'CALL', 'IF', 'THEN', 'ELSE', 'END', 'FOR', 'IN', 'DO', 'CALC',
    'NOW', # Built-in function
    'ID',       # Identifiers
    'NUMBER',   # Integer or floating point
    'STRING',   # String literals
    'BOOLEAN',  # True or False
    'ASSIGN',   # =
    'EQ',       # ==
    'NE',       # !=
    'GT',       # >
    'LT',       # <
    'GE',       # >=
    'LE',       # <=
    'AND',      # AND
    'OR',       # OR
    'NOT',      # NOT
    'LBRACE',   # {
    'RBRACE',   # }
    'LPAREN',   # (
    'RPAREN',   # )
    'COLON',    # :
    'COMMA',    # ,
    'DOT',      # . (for accessing struct fields like nft.rarity)
    # We might need 'FORMULA' for CALC block content later
)

# Reserved words
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
    'AND': 'AND',
    'OR': 'OR',
    'NOT': 'NOT',
    'NOW': 'NOW',
    'true': 'BOOLEAN',
    'false': 'BOOLEAN',
    'null': 'LITERAL_NULL', # Maybe handle null later if needed
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
    # Check for reserved words
    t.type = reserved.get(t.value, 'ID')
    # Check for boolean literals explicitly
    if t.value == 'true':
        t.value = True
        t.type = 'BOOLEAN'
    elif t.value == 'false':
        t.value = False
        t.type = 'BOOLEAN'
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
    # Example usage for testing
    test_script = """
    // This is a sample script
    LET price = CALL get_price { token: "BTC" }
    LET threshold = 70000.5
    IF price < threshold AND NOT (price == 0) THEN
        CALL swap {
            from_token: "USDT",
            to_token: "BTC",
            amount: 100
        }
        LET success = true
    ELSE
        CALL reply { message: "Price too high or zero." }
        LET success = false
    END

    LET user_name = "John \\"Agent\\" Doe" // Test string escape
    LET config = { key: "value", count: 1 } // Simple map-like structure (needs parsing adjustment)
    LET current_time = NOW()

    FOR item IN items DO
        // Loop body
        LET item_value = item.value
    END
    """

    tokens_found = tokenize_script(test_script)
    for token in tokens_found:
        print(token)
