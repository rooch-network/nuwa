import { Token, TokenType } from './lexer';
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
        let expr = this.parseUnary(); // Parse higher precedence first
        while (this.match(TokenType.STAR, TokenType.SLASH)) {
            const operator = this.previous().type as AST.BinaryOperator; // '*' or '/'
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
        return this.parsePrimary();
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

        // List Literal
        if (this.match(TokenType.LBRACKET)) {
            const elements: AST.Expression[] = [];
            if (!this.check(TokenType.RBRACKET)) { // Handle non-empty list
                do {
                    // Prevent leading/trailing comma by checking right after LBRACKET/COMMA
                    if (this.check(TokenType.RBRACKET)) break; // Allow trailing comma like [1,] but stop
                    elements.push(this.parseExpression());
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RBRACKET, "Expected ']' after list elements.");
            // The interpreter will evaluate the expressions in the list later if needed,
            // but for a literal list, all elements should ideally be literals themselves.
            // For simplicity now, we parse them as Expressions.
            // A stricter parser might enforce literal-only elements here.
            // We will construct a literal array node.
            // The value needs to be created by evaluating the expressions, which
            // cannot be done reliably at parse time. We'll represent it structurally.
            // This deviates slightly - maybe need a ListExpr node?
            // Let's stick to LiteralExpr but mark it clearly.
            // Issue: LiteralExpr expects NuwaValue, not Expression[].
            // SOLUTION: Introduce ListExpr node type.
            throw new Error("List literal parsing needs ListExpr AST node - not implemented yet.");
            // Correct approach requires adding ListExpr to ast.ts and returning that:
            // return { kind: 'ListExpr', elements };
        }

        // Variable
        if (this.match(TokenType.IDENTIFIER)) {
            // Handle member access like obj.prop.prop2
            let name = this.previous().value;
            while(this.match(TokenType.DOT)) {
                const memberToken = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'.");
                name += '.' + memberToken.value;
            }
            return { kind: 'VariableExpr', name };
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
        throw new ParserError(`Expected expression, got ${this.peek().type}`, this.peek());
    }

     // Parses CALL tool { ... } when used as an expression
    private parseToolCallExpression(): AST.ToolCallExpr {
        this.consume(TokenType.CALL, "Expected 'CALL'."); // Re-consume
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expected tool name after 'CALL'.");
        const args = this.parseArguments(); // Reuse argument parsing logic
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
    const { tokenize } = require('./lexer'); // Use require for potential dynamic import/testing ease
    const tokens = tokenize(sourceCode);
    const parser = new Parser(tokens);
    return parser.parse();
}
