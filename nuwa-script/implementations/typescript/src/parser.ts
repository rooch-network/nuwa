import { Token, TokenType, tokenize } from './lexer';
import * as AST from './ast';
import { NuwaValue } from './values'; // For literal parsing

class ParserError extends Error {
    constructor(message: string, public token?: Token) {
        const position = token ? ` at ${token.line}:${token.column}` : '';
        super(`${message}${position}`);
        this.name = 'ParserError';
        Object.setPrototypeOf(this, ParserError.prototype);
    }
}

export class Parser {
    private tokens: Token[] = [];
    private current: number = 0; // Index of the next token to consume

    constructor(tokens: Token[]) {
        // Filter out whitespace and comments before parsing
        this.tokens = tokens.filter(token =>
            token.type !== TokenType.WHITESPACE && token.type !== TokenType.COMMENT
        );
        this.current = 0;
    }

    /**
     * Parses the token stream into a Script AST node.
     */
    public parse(): AST.Script {
        const statements: AST.Statement[] = [];
        while (!this.isAtEnd()) {
            statements.push(this.parseStatement());
        }
        return { kind: 'Script', statements };
    }

    // --- Statement Parsing ---

    private parseStatement(): AST.Statement {
        switch (this.peek().type) {
            case TokenType.LET:
                return this.parseLetStatement();
            case TokenType.CALL:
                // Check if it's CALL used as statement or expression context (not really possible at statement level)
                return this.parseCallStatement();
             case TokenType.PRINT:
                return this.parsePrintStatement();
            case TokenType.IF:
                return this.parseIfStatement();
            case TokenType.FOR:
                return this.parseForStatement();
            default:
                throw new ParserError(`Unexpected token type '${this.peek().type}' at start of statement`, this.peek());
                // Or potentially try parsing an expression statement if the language supported it
        }
    }

    private parseLetStatement(): AST.LetStatement {
        this.consume(TokenType.LET, "Expected 'LET' keyword.");
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'LET'.");
        this.consume(TokenType.ASSIGN, "Expected '=' after variable name.");
        const value = this.parseExpression();
        // Optional: Expect END or newline? For now, assume simple structure.
        return { kind: 'LetStatement', variableName: nameToken.value, value };
    }

     private parseCallStatement(): AST.CallStatement {
        this.consume(TokenType.CALL, "Expected 'CALL' keyword.");
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expected tool name after 'CALL'.");
        const args = this.parseArguments();
        return { kind: 'CallStatement', toolName: nameToken.value, arguments: args };
    }

    private parsePrintStatement(): AST.PrintStatement {
        this.consume(TokenType.PRINT, "Expected 'PRINT' keyword.");
        this.consume(TokenType.LPAREN, "Expected '(' after 'PRINT'.");
        const value = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expected ')' after PRINT expression.");
        return { kind: 'PrintStatement', value };
    }

     private parseIfStatement(): AST.IfStatement {
        this.consume(TokenType.IF, "Expected 'IF' keyword.");
        const condition = this.parseExpression();
        this.consume(TokenType.THEN, "Expected 'THEN' after IF condition.");

        const thenBlock: AST.Statement[] = [];
        while (!this.check(TokenType.ELSE) && !this.check(TokenType.END) && !this.isAtEnd()) {
            thenBlock.push(this.parseStatement());
        }

        let elseBlock: AST.Statement[] | undefined = undefined;
        if (this.match(TokenType.ELSE)) {
            elseBlock = [];
            while (!this.check(TokenType.END) && !this.isAtEnd()) {
                elseBlock.push(this.parseStatement());
            }
        }

        this.consume(TokenType.END, "Expected 'END' to close 'IF' statement.");
        return { kind: 'IfStatement', condition, thenBlock, elseBlock };
    }

     private parseForStatement(): AST.ForStatement {
        this.consume(TokenType.FOR, "Expected 'FOR' keyword.");
        const iteratorToken = this.consume(TokenType.IDENTIFIER, "Expected iterator variable name after 'FOR'.");
        this.consume(TokenType.IN, "Expected 'IN' after iterator variable.");
        const iterable = this.parseExpression();
        this.consume(TokenType.DO, "Expected 'DO' after iterable expression.");

        const loopBlock: AST.Statement[] = [];
        while (!this.check(TokenType.END) && !this.isAtEnd()) {
            loopBlock.push(this.parseStatement());
        }

        this.consume(TokenType.END, "Expected 'END' to close 'FOR' statement.");
        return { kind: 'ForStatement', iteratorVariable: iteratorToken.value, iterable, loopBlock };
    }

    // --- Argument Parsing for CALL ---

    private parseArguments(): Record<string, AST.Expression> {
        this.consume(TokenType.LBRACE, "Expected '{' to start arguments block.");
        const args: Record<string, AST.Expression> = {};
        if (!this.check(TokenType.RBRACE)) { // Check if block is not empty
            do {
                const keyToken = this.consume(TokenType.IDENTIFIER, "Expected argument name.");
                this.consume(TokenType.COLON, "Expected ':' after argument name.");
                const value = this.parseExpression();
                args[keyToken.value] = value;
            } while (this.match(TokenType.COMMA)); // Continue if comma is found
        }
        this.consume(TokenType.RBRACE, "Expected '}' to end arguments block.");
        return args;
    }


    // --- Expression Parsing (Recursive Descent with Precedence) ---

    private parseExpression(): AST.Expression {
        return this.parseLogicalOr(); // Start with lowest precedence (OR)
    }

    private parseLogicalOr(): AST.Expression {
        let expr = this.parseLogicalAnd();
        while (this.match(TokenType.OR)) {
            const operator = this.previous().type as AST.BinaryOperator; // Should be 'OR'
            const right = this.parseLogicalAnd();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
        }
        return expr;
    }

    private parseLogicalAnd(): AST.Expression {
        let expr = this.parseEquality();
        while (this.match(TokenType.AND)) {
            const operator = this.previous().type as AST.BinaryOperator; // Should be 'AND'
            const right = this.parseEquality();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
        }
        return expr;
    }

    private parseEquality(): AST.Expression {
        let expr = this.parseComparison();
        while (this.match(TokenType.EQ, TokenType.NE)) {
            const operator = this.previous().type as AST.BinaryOperator; // '==' or '!='
            const right = this.parseComparison();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
        }
        return expr;
    }

    private parseComparison(): AST.Expression {
        let expr = this.parseTerm(); // Parse higher precedence: +, -
        while (this.match(TokenType.GT, TokenType.GE, TokenType.LT, TokenType.LE)) {
             const operator = this.previous().type as AST.BinaryOperator; // '>', '>=', '<', '<='
            const right = this.parseTerm();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
        }
        return expr;
    }

    // Term handles Addition (+) and Subtraction (-)
    private parseTerm(): AST.Expression {
         let expr = this.parseFactor(); // Parse higher precedence first
         while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.previous().type as AST.BinaryOperator; // '+' or '-'
            const right = this.parseFactor();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
         }
         return expr;
    }

    // Factor handles Multiplication (*) and Division (/)
    private parseFactor(): AST.Expression {
        // Factor now calls parseUnary, which handles postfix operations
        let expr = this.parseUnary();
        while (this.match(TokenType.STAR, TokenType.SLASH)) {
            const operator = this.previous().type as AST.BinaryOperator; // '*' or '/'
            // Note: The right operand should also potentially handle postfix ops
            const right = this.parseUnary();
            expr = { kind: 'BinaryOpExpr', operator, left: expr, right };
        }
        return expr;
    }

    private parseUnary(): AST.Expression {
        // Handle unary PLUS and MINUS (as well as NOT)
        if (this.match(TokenType.NOT, TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.previous().type as AST.UnaryOperator;
            // Unary operators typically apply to the result of the next highest precedence level,
            // which could potentially be another unary operation (e.g., - - 1)
            // or a primary expression.
            // Let's have unary parse unary for right-associativity (or simply primary if simpler).
            const operand = this.parseUnary(); // Recursively parse operand
            return { kind: 'UnaryOpExpr', operator, operand };
        }
        // If no unary operator, parse the next level down
        // Instead of primary, call postfix which handles primary AND subsequent [] . ()
        return this.parsePostfix(); // CHANGED: Call parsePostfix here
    }

    // NEW METHOD: Handles postfix operations like array indexing [], member access ., and function calls ()
    private parsePostfix(): AST.Expression {
        // First, parse the primary expression (the base)
        let expr = this.parsePrimary();

        // Then, loop to check for postfix operators
        while (true) {
            if (this.match(TokenType.LBRACKET)) {
                // Array index operator '['
                const index = this.parseExpression(); // Parse the index expression
                this.consume(TokenType.RBRACKET, "Expected ']' after array index expression.");
                // Create the ArrayIndexExpression node, using the current expression as the object
                expr = { kind: 'ArrayIndexExpression', object: expr, index };
            } else if (this.match(TokenType.DOT)) { // Enable DOT handling
                // Member Access operator '.'
                const propertyToken = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'.");
                expr = { kind: 'MemberAccessExpr', object: expr, property: propertyToken.value };
            }
            /* // Future Extension: Function Call () - Needs more sophisticated argument parsing integration
             else if (this.match(TokenType.LPAREN)) {
                 // Parse arguments...
                 this.consume(TokenType.RPAREN, "Expected ')' after arguments.");
             */
            else {
                // No more postfix operators, break the loop
                break;
            }
        }

        return expr;
    }

    private parsePrimary(): AST.Expression {
        // Literals
        if (this.match(TokenType.TRUE)) return { kind: 'LiteralExpr', value: true };
        if (this.match(TokenType.FALSE)) return { kind: 'LiteralExpr', value: false };
        if (this.match(TokenType.NULL)) return { kind: 'LiteralExpr', value: null };
        if (this.match(TokenType.NUMBER)) {
            return { kind: 'LiteralExpr', value: parseFloat(this.previous().value) };
        }
        if (this.match(TokenType.STRING)) {
             // Lexer already processed escapes and removed quotes via JSON.parse
            return { kind: 'LiteralExpr', value: this.previous().value };
        }

        // List Literal [ ... ]
        if (this.match(TokenType.LBRACKET)) {
            const elements: AST.Expression[] = [];
            // To handle potential ambiguity with index operator, we must *not* consume LBRACKET here
            // if it's followed by an expression and RBRACKET in the context of parsePostfix.
            // However, parsePrimary is called first. Let's assume list literals are distinct.
            // The `match` call above already consumed LBRACKET for the list literal case.
            if (!this.check(TokenType.RBRACKET)) { // Handle non-empty list
                do {
                    if (this.check(TokenType.RBRACKET)) break;
                    elements.push(this.parseExpression());
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RBRACKET, "Expected ']' after list elements.");

             // !!! Important Correction for List Literals !!!
            // The interpreter needs the evaluated values, not expressions, for a literal.
            // We need a specific AST node for List Literals, or handle evaluation here.
            // Let's introduce ListLiteralExpr to AST first.
            // For now, let's keep parsing elements as Expressions and create a generic
            // structure that the interpreter will handle. This is complex.

            // **Temporary simplification**: Create a LiteralExpr with a placeholder or
            // leave elements as expressions for the interpreter to resolve.
            // Let's create a dedicated ListLiteralExpr node in AST later if needed.
            // For now, let's assume the interpreter can handle evaluating expressions
            // inside a structure representing the list.
            // How to represent this in AST? Maybe just use LiteralExpr with an array value?
            // This is tricky because the *elements* are expressions, not values yet.
            //
            // Let's stick to the original plan of having elements as Expression[] and
            // create a dedicated node type if issues arise. The interpreter will evaluate them.
            // Let's define ListLiteralExpr in ast.ts NEXT.
            // *** TEMPORARY HACK for now: Return a LiteralExpr that the interpreter won't handle correctly ***
            // We need to add ListLiteralExpr to ast.ts and modify this code block.
            // For the current goal of ARRAY INDEXING, let's just throw an error for list literals for now.
             throw new ParserError("List literals [ ... ] are not fully implemented yet.", this.previous());

             /* // Ideal future code after adding ListLiteralExpr to ast.ts:
              return { kind: 'ListLiteralExpr', elements };
             */
        }

        // Variable (single identifier only now)
        if (this.match(TokenType.IDENTIFIER)) {
            // Now only handles simple 'variable', not 'variable.dotted.name'
            // Dotted names are handled by parsePostfix recognizing the DOT token.
            return { kind: 'VariableExpr', name: this.previous().value };
        }

        // Function Calls (NOW())
        if (this.match(TokenType.NOW)) {
            this.consume(TokenType.LPAREN, "Expected '(' after 'NOW'.");
            this.consume(TokenType.RPAREN, "Expected ')' after 'NOW()'.");
            return { kind: 'FunctionCallExpr', functionName: 'NOW' };
        }

        // Tool Calls used as expressions
        if (this.match(TokenType.CALL)) {
            // Need to backtrack slightly as we consumed CALL
            this.current--; // Go back to CALL token
            return this.parseToolCallExpression();
        }

        // Parenthesized expression
        if (this.match(TokenType.LPAREN)) {
            const expr = this.parseExpression();
            this.consume(TokenType.RPAREN, "Expected ')' after expression.");
            return expr;
        }

        // Error
        throw new ParserError(`Unexpected token type '${this.peek().type}' in expression`, this.peek());
    }

     // NEW HELPER for CALL used as an expression
    private parseToolCallExpression(): AST.ToolCallExpr {
         this.consume(TokenType.CALL, "Expected 'CALL' keyword."); // Already checked, but good practice
         const nameToken = this.consume(TokenType.IDENTIFIER, "Expected tool name after 'CALL'.");
         const args = this.parseArguments(); // Reuse argument parsing
         return { kind: 'ToolCallExpr', toolName: nameToken.value, arguments: args };
    }

    // --- Parser Helpers ---

    // Checks if the current token is of the given type(s) without consuming it.
    private check(...types: TokenType[]): boolean {
        if (this.isAtEnd()) return false;
        return types.includes(this.peek().type);
    }

    // Consumes the current token if it matches one of the given types.
    private match(...types: TokenType[]): boolean {
        if (this.check(...types)) {
            this.advance();
            return true;
        }
        return false;
    }

    // Consumes the current token if it's of the expected type, otherwise throws an error.
    private consume(type: TokenType, errorMessage: string): Token {
        if (this.check(type)) {
            return this.advance();
        }
        throw new ParserError(errorMessage, this.peek());
    }

    // Moves to the next token and returns the previous one.
    private advance(): Token {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }

    // Checks if we've run out of tokens (ignoring EOF).
    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    // Returns the current token without consuming it.
    private peek(): Token {
        return this.tokens[this.current]!;
    }

    // Returns the most recently consumed token.
    private previous(): Token {
        return this.tokens[this.current - 1]!;
    }
}

/**
 * Convenience function to parse NuwaScript source code directly.
 * @param sourceCode The NuwaScript code string.
 * @returns The parsed Script AST node.
 * @throws LexerError or ParserError on failure.
 */
export function parse(sourceCode: string): AST.Script {
    const tokens = tokenize(sourceCode);
    const parser = new Parser(tokens);
    return parser.parse();
}
