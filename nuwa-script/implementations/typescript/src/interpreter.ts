import * as AST from './ast';
import { ToolRegistry, RegisteredTool, EvaluatedToolArguments, ToolContext } from './tools';
import {
    NuwaValue, NuwaObject, nuwaValuesAreEqual, isNuwaBoolean, isNuwaList,
    isNuwaNumber, isNuwaObject, nuwaValueToString
} from './values';
import {
    InterpreterError, RuntimeError, TypeError, UndefinedVariableError,
    MemberAccessError, ToolNotFoundError, ToolArgumentError, ToolExecutionError,
    UnsupportedOperationError, DivisionByZeroError, InvalidConditionError,
    InvalidIterableError,
    IndexOutOfBoundsError
} from './errors';
import { isArrayIndexExpression, isMemberAccessExpression, isListLiteralExpr, isObjectLiteralExpr } from './ast';

// Type for the variable scope
export type Scope = Map<string, NuwaValue>;
// Type for the output handler (e.g., for PRINT)
export type OutputHandler = (output: string) => void;

export class Interpreter {
    private toolRegistry: ToolRegistry;
    private readonly outputHandler: OutputHandler;

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

    /**
     * Gets the tool registry used by this interpreter.
     * @returns The tool registry.
     */
    getToolRegistry(): ToolRegistry {
        return this.toolRegistry;
    }

    /**
     * Sets a state value in the tool registry.
     * @param key - The state key.
     * @param value - The state value.
     */
    setState(key: string, value: NuwaValue): void {
        this.toolRegistry.setState(key, value);
    }

    /**
     * Gets a state value from the tool registry.
     * @param key - The state key.
     * @returns The state value or undefined if not found.
     */
    getStateValue(key: string): NuwaValue | undefined {
        return this.toolRegistry.getStateValue(key);
    }

    /**
     * Checks if a state value exists in the tool registry.
     * @param key - The state key.
     * @returns True if the state value exists, false otherwise.
     */
    hasState(key: string): boolean {
        return this.toolRegistry.hasState(key);
    }

    /**
     * Gets all state values from the tool registry.
     * @returns The state store.
     */
    getAllState(): Map<string, NuwaValue> {
        return this.toolRegistry.getState();
    }

    /**
     * Clears all state values in the tool registry.
     */
    clearState(): void {
        this.toolRegistry.clearState();
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
                return this.evaluateFunctionCallExpr(expression, scope);
             case 'ToolCallExpr':
                return await this.evaluateToolCallExpr(expression, scope);

            // Add case for ArrayIndexExpression
            case 'ArrayIndexExpression':
                return await this.evaluateArrayIndexExpression(expression, scope);

            // Add case for MemberAccessExpression
            case 'MemberAccessExpr':
                return await this.evaluateMemberAccessExpression(expression, scope);

            // Add case for ListLiteralExpr
            case 'ListLiteralExpr':
                return await this.evaluateListLiteralExpr(expression, scope);

            // Add case for ObjectLiteralExpr
            case 'ObjectLiteralExpr':
                return await this.evaluateObjectLiteralExpr(expression, scope);

            default:
                 // Update exhaustiveness check (though TS switch should handle it)
                if (isListLiteralExpr(expression)) {
                    return await this.evaluateListLiteralExpr(expression, scope);
                }
                if (isObjectLiteralExpr(expression)) {
                    return await this.evaluateObjectLiteralExpr(expression, scope);
                }
                if (isArrayIndexExpression(expression)) {
                    return await this.evaluateArrayIndexExpression(expression, scope);
                }
                if (isMemberAccessExpression(expression)) {
                    return await this.evaluateMemberAccessExpression(expression, scope);
                }
                const exhaustiveCheck: never = expression;
                throw new RuntimeError(`Unsupported expression kind: ${(exhaustiveCheck as any)?.kind}`, expression);
        }
    }

    private evaluateVariableExpr(expr: AST.VariableExpr, scope: Scope): NuwaValue {
        const name = expr.name;
        // --- IMPORTANT ---
        // The logic for dotted names (e.g., obj.prop.sub) is now handled by
        // the combination of VariableExpr (for the base 'obj') and successive
        // MemberAccessExpr evaluations triggered by the parser recognizing '.'
        // So, VariableExpr evaluation *only* needs to handle simple lookups.
        // Remove the old dotted name logic from here.
        const value = scope.get(name);
        if (value === undefined) {
            throw new UndefinedVariableError(name, expr);
        }
        return value;
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

    private async evaluateFunctionCallExpr(expr: AST.FunctionCallExpr, scope: Scope): Promise<NuwaValue> {
        const functionName = expr.functionName;

        // Evaluate arguments first
        const evaluatedArgs = [];
        for (const arg of expr.arguments) {
            evaluatedArgs.push(await this.evaluateExpression(arg, scope));
        }

        // Handle built-in functions
        switch (functionName) {
            case 'NOW':
                if (evaluatedArgs.length !== 0) {
                    throw new RuntimeError(`Function NOW() expects no arguments, got ${evaluatedArgs.length}`, expr);
                }
                return Math.floor(Date.now() / 1000);

            case 'FORMAT':
                return this.evaluateFormatFunction(evaluatedArgs, expr);

            // Future: User-defined functions might be looked up in scope here
            default:
                throw new RuntimeError(`Unknown function called: ${functionName}`, expr);
        }
    }

    // Helper function for FORMAT logic
    private evaluateFormatFunction(args: NuwaValue[], callExpr: AST.FunctionCallExpr): string {
        if (args.length !== 2) {
            throw new RuntimeError(`FORMAT function expects 2 arguments (template string, values object), got ${args.length}`, callExpr);
        }

        const templateArg = args[0];
        const valuesArg = args[1];

        if (typeof templateArg !== 'string') {
            throw new TypeError(`FORMAT function's first argument must be a string, got ${typeof templateArg}`, { node: callExpr.arguments[0] });
        }

        // Explicitly check if valuesArg is undefined to satisfy the type checker before calling isNuwaObject
        if (valuesArg === undefined) {
             // This case should logically be unreachable due to the args.length check above
            throw new RuntimeError(`FORMAT function received undefined second argument (internal error).`, callExpr);
        }

        // Now valuesArg is narrowed down to NuwaValue, so the call is safe
        if (!isNuwaObject(valuesArg)) {
            throw new TypeError(`FORMAT function's second argument must be an object, got ${typeof valuesArg}`, { node: callExpr.arguments[1] });
        }

        const templateString = templateArg;
        const valuesObject = valuesArg; // Already checked as NuwaObject

        // Regex to find {key}, {{, or }}
        // Define regex only once
        const regex = /\{([a-zA-Z_][a-zA-Z_0-9]*)\}|\{\{|\}\}/g;
        let result = '';
        let lastIndex = 0;
        let match; // Declare match here

        while ((match = regex.exec(templateString)) !== null) {
            // Append text before the match
            result += templateString.substring(lastIndex, match.index);

            if (match[0] === '{{') { // Escaped '{'
                result += '{';
            } else if (match[0] === '}}') { // Escaped '}'
                result += '}';
            } else if (match[1]) { // Named placeholder {key}
                const key = match[1];
                // Use Object.prototype.hasOwnProperty for safety
                if (Object.prototype.hasOwnProperty.call(valuesObject, key)) {
                    const valueToFormat = valuesObject[key];
                    // Remove the explicit undefined check as hasOwnProperty confirms presence
                    // Use non-null assertion (!) to satisfy TypeScript since NuwaValue doesn't include undefined
                    // Ensure nuwaValueToString is imported from './values'
                    result += nuwaValueToString(valueToFormat!); // Use existing helper from values.ts
                } else {
                    // Provide context in error message
                    throw new RuntimeError(`Key '${key}' not found in FORMAT arguments object`, callExpr.arguments[1]);
                }
            }
            lastIndex = regex.lastIndex;
        }

        // Append remaining text after the last match
        result += templateString.substring(lastIndex);

        return result; // Return the final string directly
    }

    private async evaluateToolCallExpr(expr: AST.ToolCallExpr, scope: Scope): Promise<NuwaValue> {
        return this.executeToolCall(expr.toolName, expr.arguments, scope);
    }

    // NEW METHOD: Evaluates a MemberAccessExpression (e.g., expr.property)
    private async evaluateMemberAccessExpression(expr: AST.MemberAccessExpr, scope: Scope): Promise<NuwaValue> {
        // 1. Evaluate the object part of the expression
        const objectValue = await this.evaluateExpression(expr.object, scope);
        const propertyName = expr.property;

        // 2. Check if the result is actually an object
        if (!isNuwaObject(objectValue)) {
            // Provide context in the error message
             const objectExprString = expr.object.kind; // Basic representation
            throw new MemberAccessError(`Cannot access property '${propertyName}' on non-object value resulting from '${objectExprString}' (type: ${typeof objectValue}).`, expr);
        }

        // 3. Check if the property exists
        if (!(propertyName in objectValue)) {
             const objectExprString = expr.object.kind;
             // Consider allowing access to non-existent properties, returning null?
             // Let's be strict for now and require existence.
            throw new MemberAccessError(`Property '${propertyName}' does not exist on object resulting from '${objectExprString}'.`, expr);
             // Alternatively, return null:
             // return null;
        }

        // 4. Access the property
        const propertyValue = objectValue[propertyName];

        // 5. Handle potential undefined values from access (convert to null)
        return propertyValue === undefined ? null : propertyValue;
    }

    // NEW METHOD: Evaluates an ArrayIndexExpression
    private async evaluateArrayIndexExpression(expr: AST.ArrayIndexExpression, scope: Scope): Promise<NuwaValue> {
        const objectValue = await this.evaluateExpression(expr.object, scope);
        const indexValue = await this.evaluateExpression(expr.index, scope);

        // Type checking
        if (!isNuwaList(objectValue)) {
            throw new TypeError(`Cannot access index on non-list value (type: ${typeof objectValue}).`, { node: expr.object });
        }
        if (!isNuwaNumber(indexValue) || !Number.isInteger(indexValue)) {
            throw new TypeError(`List index must be an integer, got ${typeof indexValue} (${indexValue}).`, { node: expr.index });
        }

        // Bounds checking
        const index = indexValue as number; // Safe cast after checks
        const array = objectValue as NuwaValue[]; // Safe cast after checks
        if (index < 0 || index >= array.length) {
            throw new IndexOutOfBoundsError(index, array.length, expr);
        }

        // Perform access, converting undefined to null
        const result = array[index];
        return result === undefined ? null : result;
    }

    // NEW METHOD: Evaluates a ListLiteralExpr
    private async evaluateListLiteralExpr(expr: AST.ListLiteralExpr, scope: Scope): Promise<NuwaValue[]> {
      const evaluatedElements: NuwaValue[] = [];
      for (const elementExpr of expr.elements) {
        const evaluatedValue = await this.evaluateExpression(elementExpr, scope);
        evaluatedElements.push(evaluatedValue);
      }
      return evaluatedElements;
    }

    // NEW METHOD: Evaluates an ObjectLiteralExpr
    private async evaluateObjectLiteralExpr(expr: AST.ObjectLiteralExpr, scope: Scope): Promise<NuwaObject> {
      const evaluatedProperties: NuwaObject = {};
      for (const key in expr.properties) {
        // Ensure hasOwnProperty check for safety, although TS AST structure makes it less critical
        if (Object.prototype.hasOwnProperty.call(expr.properties, key)) {
          const valueExpr = expr.properties[key];
          if (valueExpr) { // Check if valueExpr is not undefined
             const evaluatedValue = await this.evaluateExpression(valueExpr, scope);
             evaluatedProperties[key] = evaluatedValue;
          } else {
              // Handle case where property value might be missing in AST (shouldn't happen with parser)
              evaluatedProperties[key] = null; // Or throw error
          }
        }
      }
      return evaluatedProperties;
    }

    // --- Tool Execution Helper ---

    /**
     * Executes a tool call with provided arguments and creates a tool context.
     * @param toolName The name of the tool to call.
     * @param argsExpr The arguments to pass to the tool as expressions.
     * @param scope The current variable scope.
     * @returns The result of the tool execution.
     * @throws ToolNotFoundError if the tool is not registered.
     * @throws ToolArgumentError if there's an issue with the arguments.
     * @throws ToolExecutionError if the tool execution fails.
     */
    private async executeToolCall(
        toolName: string,
        argsExpr: Record<string, AST.Expression>,
        scope: Scope
    ): Promise<NuwaValue> {
        const tool = this.toolRegistry.lookup(toolName);
        if (!tool) {
            throw new ToolNotFoundError(`Tool '${toolName}' not found.`, {toolName});
        }
            
        const { schema, execute } = tool;
        const parameterDefs = schema.parameters;
        const evaluatedArgs: EvaluatedToolArguments = {};
        
        // Evaluate each argument expression
        for (const [argName, argExpr] of Object.entries(argsExpr)) {
            evaluatedArgs[argName] = await this.evaluateExpression(argExpr, scope);
        }
        
        // Validate required parameters are provided
        for (const param of parameterDefs) {
            if (param.required !== false && !(param.name in evaluatedArgs)) {
                // Required parameter is missing
                throw new ToolArgumentError(
                    `Missing required parameter '${param.name}' for tool '${toolName}'.`,
                    {toolName, parameter: param.name}
                );
            }
            // Could add type checking here too
        }
        
        // Create a tool context with current state
        const context = this.toolRegistry.createToolContext();
        
        try {
            // Pass both evaluated arguments and the context to the tool function
            const result = await execute(evaluatedArgs, context);
            return result;
        } catch (error) {
            // Convert any error to a ToolExecutionError
            if (error instanceof Error) {
                throw new ToolExecutionError(
                    `Error executing tool '${toolName}': ${error.message}`,
                    {toolName, error}
                );
            }
            throw new ToolExecutionError(
                `Unknown error executing tool '${toolName}'.`,
                {toolName}
            );
        }
    }
}
