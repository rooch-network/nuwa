import * as AST from './ast';
import { ToolRegistry, RegisteredTool, EvaluatedToolArguments } from './tools';
import {
    NuwaValue, NuwaObject, nuwaValuesAreEqual, isNuwaBoolean, isNuwaList,
    isNuwaNumber, isNuwaObject, nuwaValueToString
} from './values';
import {
    InterpreterError, RuntimeError, TypeError, UndefinedVariableError,
    MemberAccessError, ToolNotFoundError, ToolArgumentError, ToolExecutionError,
    UnsupportedOperationError, DivisionByZeroError, InvalidConditionError,
    InvalidIterableError
} from './errors';

// Type for the variable scope
export type Scope = Map<string, NuwaValue>;
// Type for the output handler (e.g., for PRINT)
export type OutputHandler = (output: string) => void;

export class Interpreter {
    private toolRegistry: ToolRegistry;
    private outputHandler: OutputHandler;

    constructor(toolRegistry?: ToolRegistry, outputHandler?: OutputHandler) {
        this.toolRegistry = toolRegistry ?? new ToolRegistry();
        // Default output handler simply logs to console
        this.outputHandler = outputHandler ?? ((output) => console.log(output));
    }

    /**
     * Executes a complete NuwaScript AST.
     * @param script The Script AST node.
     * @param initialScope Optional initial variable scope.
     * @returns A Promise resolving to the final variable scope.
     */
    async execute(script: AST.Script, initialScope?: Scope): Promise<Scope> {
        if (script.kind !== 'Script') {
            throw new InterpreterError("Invalid AST root: expected 'Script'");
        }
        // Create the top-level scope for this execution
        const scope: Scope = initialScope ? new Map(initialScope) : new Map();
        await this.executeStatements(script.statements, scope);
        return scope;
    }

    // --- Statement Execution ---

    private async executeStatements(statements: AST.Statement[], scope: Scope): Promise<void> {
        for (const statement of statements) {
            // TODO: Add check for return/break/continue signals if those are added later
            await this.executeStatement(statement, scope);
        }
    }

    private async executeStatement(statement: AST.Statement, scope: Scope): Promise<void> {
        switch (statement.kind) {
            case 'LetStatement':
                await this.executeLetStatement(statement, scope);
                break;
            case 'CallStatement':
                await this.executeCallStatement(statement, scope);
                break;
            case 'IfStatement':
                await this.executeIfStatement(statement, scope);
                break;
            case 'ForStatement':
                await this.executeForStatement(statement, scope);
                break;
            case 'PrintStatement':
                await this.executePrintStatement(statement, scope);
                break;
            default:
                // This ensures exhaustiveness checking if new statement kinds are added
                const exhaustiveCheck: never = statement;
                throw new RuntimeError(`Unsupported statement kind: ${(exhaustiveCheck as any)?.kind}`, statement);
        }
    }

    private async executeLetStatement(stmt: AST.LetStatement, scope: Scope): Promise<void> {
        const value = await this.evaluateExpression(stmt.value, scope);
        scope.set(stmt.variableName, value);
    }

    private async executeCallStatement(stmt: AST.CallStatement, scope: Scope): Promise<void> {
        // Evaluate arguments and execute the tool, ignoring the return value
        await this.executeToolCall(stmt.toolName, stmt.arguments, scope);
    }

     private async executePrintStatement(stmt: AST.PrintStatement, scope: Scope): Promise<void> {
        const value = await this.evaluateExpression(stmt.value, scope);
        this.outputHandler(nuwaValueToString(value)); // Use the toString helper
    }

    private async executeIfStatement(stmt: AST.IfStatement, scope: Scope): Promise<void> {
        const conditionValue = await this.evaluateExpression(stmt.condition, scope);
        if (!isNuwaBoolean(conditionValue)) {
            throw new InvalidConditionError(`IF condition evaluated to type ${typeof conditionValue}, expected boolean.`, stmt.condition);
        }

        if (conditionValue) {
            await this.executeStatements(stmt.thenBlock, scope);
        } else if (stmt.elseBlock) {
            await this.executeStatements(stmt.elseBlock, scope);
        }
    }

    private async executeForStatement(stmt: AST.ForStatement, scope: Scope): Promise<void> {
        const iterableValue = await this.evaluateExpression(stmt.iterable, scope);
        if (!isNuwaList(iterableValue)) {
            throw new InvalidIterableError(`FOR loop expected an iterable list, got ${typeof iterableValue}.`, stmt.iterable);
        }

        // Loop through the items
        for (const item of iterableValue) {
            // Create a temporary inner scope for the loop variable to avoid overwriting
            // variables from outer scopes if names clash, and to handle shadowing correctly.
            // For simplicity now, we just set/unset on the current scope.
            // A more robust implementation uses nested scopes.
            const old_value = scope.get(stmt.iteratorVariable);
            scope.set(stmt.iteratorVariable, item);

            try {
                // Execute loop block with the iterator variable set
                await this.executeStatements(stmt.loopBlock, scope);
                // TODO: Add BREAK/CONTINUE handling here
            } finally {
                // Restore the previous value (or undefined if it didn't exist)
                if (old_value !== undefined) {
                    scope.set(stmt.iteratorVariable, old_value);
                } else {
                    scope.delete(stmt.iteratorVariable);
                }
            }
        }
    }

    // --- Expression Evaluation ---

    private async evaluateExpression(expression: AST.Expression, scope: Scope): Promise<NuwaValue> {
        switch (expression.kind) {
            case 'LiteralExpr':
                return expression.value;
            case 'VariableExpr':
                return this.evaluateVariableExpr(expression, scope);
            case 'BinaryOpExpr':
                return await this.evaluateBinaryOpExpr(expression, scope);
            case 'UnaryOpExpr':
                return await this.evaluateUnaryOpExpr(expression, scope);
            case 'FunctionCallExpr':
                return this.evaluateFunctionCallExpr(expression); // NOW() is sync
             case 'ToolCallExpr':
                return await this.evaluateToolCallExpr(expression, scope);
            // case 'CalcExpr': // Removed
            //     throw new UnsupportedOperationError("CALC expressions are not supported.", expression);
            default:
                const exhaustiveCheck: never = expression;
                throw new RuntimeError(`Unsupported expression kind: ${(exhaustiveCheck as any)?.kind}`, expression);
        }
    }

    private evaluateVariableExpr(expr: AST.VariableExpr, scope: Scope): NuwaValue {
        const name = expr.name;
        // Handle member access (e.g., obj.prop.sub)
        if (name.includes('.')) {
            const parts = name.split('.');
            const baseVarName = parts[0]!;
            let currentVal: NuwaValue | undefined = scope.get(baseVarName);

            if (currentVal === undefined) {
                throw new UndefinedVariableError(baseVarName, expr);
            }

            for (let i = 1; i < parts.length; i++) {
                const member = parts[i]!;
                // Ensure currentVal is checked for undefined before proceeding
                if (currentVal === undefined) {
                    // This case should ideally not be reached due to prior checks,
                    // but belts and suspenders approach.
                     throw new MemberAccessError(`Cannot access property '${member}' on undefined value during access of '${name}'.`, expr);
                }
                if (!isNuwaObject(currentVal)) {
                    throw new MemberAccessError(`Cannot access property '${member}' on non-object value (type: ${typeof currentVal}) for '${name}'.`, expr);
                }
                // Check property existence explicitly
                if (!(member in currentVal)) {
                     throw new MemberAccessError(`Property '${member}' does not exist on object for '${name}'.`, expr);
                }
                // Access the property, it might be undefined but that's a valid NuwaValue (null)
                currentVal = currentVal[member];
            }

            // After loop, currentVal holds the final value or could be undefined if a property held it
            // We treat undefined from property access as null in NuwaScript runtime?
            // Or should we error if intermediate is undefined? Let's treat undefined property as null.
            return currentVal === undefined ? null : currentVal;

        } else {
            // Simple variable lookup
            const value = scope.get(name);
            if (value === undefined) {
                throw new UndefinedVariableError(name, expr);
            }
            return value;
        }
    }

    private async evaluateBinaryOpExpr(expr: AST.BinaryOpExpr, scope: Scope): Promise<NuwaValue> {
        const left = await this.evaluateExpression(expr.left, scope);
        const right = await this.evaluateExpression(expr.right, scope);
        const op = expr.operator;

        switch (op) {
            // Equality (using deep equality check)
            case '==': return nuwaValuesAreEqual(left, right);
            case '!=': return !nuwaValuesAreEqual(left, right);

            // Comparisons (expect numbers)
            case '>':
            case '<':
            case '>=':
            case '<=':
                if (!isNuwaNumber(left) || !isNuwaNumber(right)) {
                    throw new TypeError(`Comparison operator '${op}' requires number operands, got ${typeof left} and ${typeof right}.`, {leftValue: left, rightValue: right, operator: op, node: expr});
                }
                if (op === '>') return left > right;
                if (op === '<') return left < right;
                if (op === '>=') return left >= right;
                if (op === '<=') return left <= right;
                break; // Should not be reached

            // Logical (expect booleans)
            case 'AND':
                if (!isNuwaBoolean(left) || !isNuwaBoolean(right)) {
                    throw new TypeError(`Logical operator 'AND' requires boolean operands, got ${typeof left} and ${typeof right}.`, {leftValue: left, rightValue: right, operator: op, node: expr});
                }
                return left && right;
            case 'OR':
                 if (!isNuwaBoolean(left) || !isNuwaBoolean(right)) {
                    throw new TypeError(`Logical operator 'OR' requires boolean operands, got ${typeof left} and ${typeof right}.`, {leftValue: left, rightValue: right, operator: op, node: expr});
                }
                return left || right;

            // Arithmetic (expect numbers)
            case '+':
            case '-':
            case '*':
            case '/':
                 if (!isNuwaNumber(left) || !isNuwaNumber(right)) {
                    throw new TypeError(`Arithmetic operator '${op}' requires number operands, got ${typeof left} and ${typeof right}.`, {leftValue: left, rightValue: right, operator: op, node: expr});
                }
                if (op === '+') return left + right;
                if (op === '-') return left - right;
                if (op === '*') return left * right;
                if (op === '/') {
                    if (right === 0) {
                        throw new DivisionByZeroError(expr);
                    }
                    return left / right;
                }
                break; // Should not be reached
        }
        throw new UnsupportedOperationError(`Binary operator '${op}' is not supported.`, expr);
    }

     private async evaluateUnaryOpExpr(expr: AST.UnaryOpExpr, scope: Scope): Promise<NuwaValue> {
        const operand = await this.evaluateExpression(expr.operand, scope);
        const op = expr.operator;

        switch (op) {
            case 'NOT':
                if (!isNuwaBoolean(operand)) {
                     throw new TypeError(`Logical operator 'NOT' requires a boolean operand, got ${typeof operand}.`, {leftValue: operand, operator: op, node: expr});
                }
                return !operand;
            case '-': // Handle unary minus
                 if (!isNuwaNumber(operand)) {
                    throw new TypeError(`Unary operator '-' requires a number operand, got ${typeof operand}.`, {leftValue: operand, operator: op, node: expr});
                }
                return -operand;
            case '+': // Handle unary plus
                if (!isNuwaNumber(operand)) {
                    throw new TypeError(`Unary operator '+' requires a number operand, got ${typeof operand}.`, {leftValue: operand, operator: op, node: expr});
                }
                return +operand; // Or just operand, as unary plus usually doesn't change number value
        }
        // The UnaryOperator type should prevent reaching here if all cases are handled
        throw new UnsupportedOperationError(`Unary operator '${op}' is not supported.`, expr);
    }

    private evaluateFunctionCallExpr(expr: AST.FunctionCallExpr): NuwaValue {
        switch (expr.functionName) {
            case 'NOW':
                // Return timestamp in seconds (like Unix time)
                return Math.floor(Date.now() / 1000);
        }
        // No other built-ins defined as expressions yet
        throw new UnsupportedOperationError(`Built-in function '${expr.functionName}' is not supported as an expression.`, expr);
    }

    private async evaluateToolCallExpr(expr: AST.ToolCallExpr, scope: Scope): Promise<NuwaValue> {
        // Evaluate arguments and execute tool call, returning the result
        return await this.executeToolCall(expr.toolName, expr.arguments, scope);
    }

    // --- Tool Execution Helper ---

    private async executeToolCall(
        toolName: string,
        argsExpr: Record<string, AST.Expression>,
        scope: Scope
    ): Promise<NuwaValue> {
        const tool = this.toolRegistry.lookup(toolName);
        const callNode = undefined; // TODO: Need a way to pass the AST node here for error reporting

        if (!tool) {
            throw new ToolNotFoundError(toolName, callNode);
        }

        const { schema, execute } = tool;

        // 1. Evaluate arguments
        const evaluatedArgs: EvaluatedToolArguments = {};
        // Use Promise.all for potentially parallel evaluation if safe
        // Or evaluate sequentially if order matters or for simplicity
        for (const paramName in argsExpr) {
            const argExpr = argsExpr[paramName];
            if (argExpr) { // Check if expression exists
                 evaluatedArgs[paramName] = await this.evaluateExpression(argExpr, scope);
            }
        }

        // 2. Validate arguments against tool.schema
        for (const paramSchema of schema.parameters) {
            const argValue = evaluatedArgs[paramSchema.name];
            const isRequired = paramSchema.required ?? true; // Default to required

            if (argValue === undefined || argValue === null) {
                if (isRequired) {
                    throw new ToolArgumentError(toolName, `Missing required argument '${paramSchema.name}'.`, callNode);
                }
                // If optional and not provided, continue (or maybe set a default?)
                continue;
            }

            // Check type based on schema
            let typeMatch = false;
            switch (paramSchema.type) {
                case 'string': typeMatch = typeof argValue === 'string'; break;
                case 'number': typeMatch = typeof argValue === 'number'; break;
                case 'boolean': typeMatch = typeof argValue === 'boolean'; break;
                case 'null': typeMatch = argValue === null; break;
                case 'list': typeMatch = isNuwaList(argValue); break;
                case 'object': typeMatch = isNuwaObject(argValue); break;
                case 'any': typeMatch = true; break; // Allow any type
                default: typeMatch = false; // Unknown schema type
            }

            if (!typeMatch) {
                 throw new ToolArgumentError(toolName, `Type mismatch for argument '${paramSchema.name}'. Expected ${paramSchema.type}, got ${typeof argValue}.`, callNode);
            }
        }
        // Optional: Check for extraneous arguments not defined in schema?

        // 3. Execute the tool function
        try {
            const result = await execute(evaluatedArgs); // Pass evaluatedArgs

            // 4. Validate return type against tool.schema.returns
            let returnTypeMatch = false;
            switch (schema.returns) {
                 case 'string': returnTypeMatch = typeof result === 'string'; break;
                 case 'number': returnTypeMatch = typeof result === 'number'; break;
                 case 'boolean': returnTypeMatch = typeof result === 'boolean'; break;
                 case 'null': returnTypeMatch = result === null; break;
                 case 'list': returnTypeMatch = isNuwaList(result); break;
                 case 'object': returnTypeMatch = isNuwaObject(result); break;
                 case 'any': returnTypeMatch = true;
                 default: returnTypeMatch = false;
            }

            if (!returnTypeMatch) {
                 // Use ToolExecutionError for return type mismatch
                 throw new ToolExecutionError(toolName, new Error(`Tool returned type ${typeof result}, but schema expected ${schema.returns}.`), callNode);
            }

            return result;
        } catch (error) {
            // Wrap the error if it's not already one of our specific types
            if (error instanceof ToolArgumentError || error instanceof ToolExecutionError || error instanceof InterpreterError) {
                throw error; // Re-throw known error types
            }
            // Wrap unknown errors from tool.execute
            throw new ToolExecutionError(toolName, error, callNode);
        }
    }
}
