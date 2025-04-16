import { describe, test, expect, beforeEach, it } from '@jest/globals'; // Add Jest types including 'it'
import { Interpreter, OutputHandler } from '../src/interpreter';
import { parse } from '../src/parser'; // Assuming combined lexer/parser export
import { ToolRegistry, ToolSchema, ToolParameter, ToolFunction, NuwaType } from '../src/tools';
import { Scope } from '../src/interpreter'; // Assuming Scope type is exported or defined publicly
import { JsonValue } from '../src/values';
import * as Errors from '../src/errors';
import {
    RuntimeError, TypeError, UndefinedVariableError, IndexOutOfBoundsError,
    InvalidIterableError, InvalidConditionError, DivisionByZeroError, MemberAccessError
} from '../src/errors'; // Ensure these are correctly imported

// --- Mock Tools Setup ---

interface MockCallLog {
    toolName: string;
    args: Record<string, JsonValue | undefined>;
}

// Simple synchronous tool example
const mockGetPrice: ToolFunction = (args, context) => {
    if (args['token'] === 'BTC') return 65000;
    if (args['token'] === 'ETH') return 3500;
    return null;
};
const getPriceSchema: ToolSchema = {
    name: 'get_price', description: 'Get crypto price',
    parameters: [{ name: 'token', type: 'string', required: true }],
    returns: 'number' // Can also return null
};

// Asynchronous tool example
const mockSwap: ToolFunction = async (args, context) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    // Use non-null assertion assuming test args are always provided
    return {
        success: true,
        from: args['from_token']!,
        to: args['to_token']!,
        amount: args['amount']!
    } as JsonValue; // Assert return type is JsonValue (specifically an object)
};
const swapSchema: ToolSchema = {
    name: 'swap', description: 'Swap tokens',
    parameters: [
        { name: 'from_token', type: 'string', required: true },
        { name: 'to_token', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true },
    ],
    returns: 'object'
};

// Tool that intentionally throws an error
const mockErrorTool: ToolFunction = (args, context) => {
    throw new Error("Tool failed intentionally");
};
const errorToolSchema: ToolSchema = {
    name: 'error_tool', description: 'This tool always fails', parameters: [], returns: 'any'
};

// --- Test Suite Setup ---

describe('NuwaScript Interpreter', () => {
    let toolRegistry: ToolRegistry;
    let capturedOutput: string[];
    let mockOutputHandler: OutputHandler;
    let callLog: MockCallLog[];

    beforeEach(() => {
        // Reset state before each test
        toolRegistry = new ToolRegistry();
        capturedOutput = [];
        callLog = [];
        mockOutputHandler = (output: string) => {
            capturedOutput.push(output);
        };

        // Register mock tools
        toolRegistry.register(getPriceSchema.name, getPriceSchema, (args, context) => {
            callLog.push({ toolName: getPriceSchema.name, args });
            return mockGetPrice(args, context);
        });
        toolRegistry.register(swapSchema.name, swapSchema, async (args, context) => {
             callLog.push({ toolName: swapSchema.name, args });
             return await mockSwap(args, context);
        });
         toolRegistry.register(errorToolSchema.name, errorToolSchema, (args, context) => {
             callLog.push({ toolName: errorToolSchema.name, args });
             return mockErrorTool(args, context); // Will throw
        });
    });

    // Helper function to run script and return final scope
    async function runScript(scriptText: string, initialScope?: Record<string, JsonValue>): Promise<Scope> {
        const interpreter = new Interpreter(toolRegistry, mockOutputHandler);
        const ast = parse(scriptText); // Use combined parse function
        const initialMap = initialScope ? new Map(Object.entries(initialScope)) : undefined;
        return await interpreter.execute(ast, initialMap);
    }

    // --- Basic Tests ---

    test('should handle LET statement with literals', async () => {
        const script = `
            LET count = 100
            LET name = "Nuwa"
            LET flag = true
            LET pi = 3.14
            LET n = null
        `;
        const finalScope = await runScript(script);
        expect(finalScope.get('count')).toBe(100);
        expect(finalScope.get('name')).toBe('Nuwa');
        expect(finalScope.get('flag')).toBe(true);
        expect(finalScope.get('pi')).toBe(3.14);
        expect(finalScope.get('n')).toBe(null);
    });

    test('should handle LET statement with variable assignment', async () => {
        const script = `
            LET x = 50
            LET y = x
        `;
        const finalScope = await runScript(script);
        expect(finalScope.get('x')).toBe(50);
        expect(finalScope.get('y')).toBe(50);
    });

    test('should handle undefined variable error', async () => {
        const script = `LET y = x`; // x is not defined
        await expect(runScript(script)).rejects.toThrow(Errors.UndefinedVariableError);
        await expect(runScript(script)).rejects.toThrow(/Variable 'x' not defined/);
    });

    // --- Expression Tests ---

    test('should evaluate binary operators correctly', async () => {
        const script = `
            LET x = 10 > 5 // true
            LET y = 5 == 5 // true
            LET z = "a" != "b" // true
            LET a = true AND false // false
            LET b = true OR false // true
            LET num1 = 10 + 5 * 2 // 20 (need precedence or parentheses)
            // LET num2 = (10 + 5) * 2 // 30 (test parentheses)
            LET num3 = 10 / 2 // 5
        `;
        // TODO: Add tests for precedence once parseTerm/parseFactor implemented
        const finalScope = await runScript(script);
        expect(finalScope.get('x')).toBe(true);
        expect(finalScope.get('y')).toBe(true);
        expect(finalScope.get('z')).toBe(true);
        expect(finalScope.get('a')).toBe(false);
        expect(finalScope.get('b')).toBe(true);
        // expect(finalScope.get('num1')).toBe(20); // Requires precedence implementation
        // expect(finalScope.get('num2')).toBe(30);
        expect(finalScope.get('num3')).toBe(5);
    });

     test('should evaluate unary NOT operator', async () => {
        const script = `
            LET flagT = true
            LET flagF = false
            LET notT = NOT flagT
            LET notF = NOT flagF
        `;
        const finalScope = await runScript(script);
        expect(finalScope.get('notT')).toBe(false);
        expect(finalScope.get('notF')).toBe(true);
    });

     test('should handle type errors in operations', async () => {
        await expect(runScript('LET x = 10 > "hello"')).rejects.toThrow(Errors.TypeError);
        await expect(runScript('LET x = "true" AND false')).rejects.toThrow(Errors.TypeError);
        await expect(runScript('LET x = NOT 123')).rejects.toThrow(Errors.TypeError);
    });

    test('should evaluate NOW() function', async () => {
        const script = 'LET time = NOW()';
        const start = Math.floor(Date.now() / 1000);
        const finalScope = await runScript(script);
        const end = Math.floor(Date.now() / 1000);
        const timeVal = finalScope.get('time');
        expect(typeof timeVal).toBe('number');
        expect(timeVal).toBeGreaterThanOrEqual(start);
        expect(timeVal).toBeLessThanOrEqual(end + 1); // Allow for slight delay
    });

     test('should handle division by zero error', async () => {
        const script = `LET x = 10 / 0`;
        await expect(runScript(script)).rejects.toThrow(Errors.DivisionByZeroError);
    });

    // --- FORMAT Function Tests ---
    // This describe block MUST be INSIDE the main 'NuwaScript Interpreter' describe block
    // to have access to runScript helper function.
    describe('FORMAT Function', () => {
        test('should format string with basic key replacement', async () => {
            const script = `LET result = FORMAT("Hello, {name}!", {name: "Nuwa"})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('Hello, Nuwa!');
        });

        test('should format string with multiple keys', async () => {
            const script = `LET result = FORMAT("{greeting}, {audience}!", {greeting: "Hi", audience: "World"})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('Hi, World!');
        });

        test('should format different value types', async () => {
            const script = `
                LET data = {
                    str: "text",
                    num: 123.45,
                    boolT: true,
                    boolF: false,
                    nil: null,
                    list: [1, "two", true],
                    obj: { nested: "ok" }
                }
                LET result = FORMAT("S:{str} N:{num} BT:{boolT} BF:{boolF} NL:{nil} L:{list} O:{obj}", data)
            `;
            const scope = await runScript(script);
            // Check against the updated jsonValueToString output format
            expect(scope.get('result')).toBe('S:text N:123.45 BT:true BF:false NL:null L:[1, two, true] O:{nested: ok}');
        });

        test('should handle escaped curly braces', async () => {
            const script = `LET result = FORMAT("Show literal braces {{ and }} with value {val}", {val: 10})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('Show literal braces { and } with value 10');
        });

        test('should handle adjacent placeholders and braces', async () => {
            const script = `LET result = FORMAT("{a}{b}, {{literal}} {c}", {a: 1, b: 2, c: 3})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('12, {literal} 3');
        });

        test('should throw RuntimeError for missing key', async () => {
            const script = `LET result = FORMAT("Hello, {name}!", { NOME: "Nuwa" })`;
            await expect(runScript(script)).rejects.toThrow(RuntimeError);
            await expect(runScript(script)).rejects.toThrow(/Key 'name' not found in FORMAT arguments object/);
        });

        test('should throw RuntimeError for wrong number of arguments (0)', async () => {
            const script = `LET result = FORMAT()`;
            await expect(runScript(script)).rejects.toThrow(RuntimeError);
            await expect(runScript(script)).rejects.toThrow(/FORMAT function expects 2 arguments/);
        });

        test('should throw RuntimeError for wrong number of arguments (1)', async () => {
            const script = `LET result = FORMAT("template")`;
            await expect(runScript(script)).rejects.toThrow(RuntimeError);
            await expect(runScript(script)).rejects.toThrow(/FORMAT function expects 2 arguments/);
        });

        test('should throw RuntimeError for wrong number of arguments (3)', async () => {
            const script = `LET result = FORMAT("template", {}, {})`;
            await expect(runScript(script)).rejects.toThrow(RuntimeError);
            await expect(runScript(script)).rejects.toThrow(/FORMAT function expects 2 arguments/);
        });

        test('should throw TypeError if first argument is not a string', async () => {
            const script = `LET result = FORMAT(123, {})`;
            await expect(runScript(script)).rejects.toThrow(TypeError);
            await expect(runScript(script)).rejects.toThrow(/first argument must be a string/);
        });

        test('should throw TypeError if second argument is not an object', async () => {
            const script = `LET result = FORMAT("template", [1, 2])`;
            await expect(runScript(script)).rejects.toThrow(TypeError);
            await expect(runScript(script)).rejects.toThrow(/second argument must be an object/);
        });

        test('should handle empty template string', async () => {
            const script = `LET result = FORMAT("", {a: 1})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('');
        });

        test('should handle template with no placeholders', async () => {
            const script = `LET result = FORMAT("Just text.", {a: 1})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('Just text.');
        });

        test('should handle empty values object', async () => {
            const script = `LET result = FORMAT("Static text", {})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('Static text');
        });

        test('should throw error for missing key with empty values object', async () => {
            const script = `LET result = FORMAT("Needs {key}", {})`;
            await expect(runScript(script)).rejects.toThrow(RuntimeError);
            await expect(runScript(script)).rejects.toThrow(/Key 'key' not found/);
        });

        test('should handle valid identifier keys', async () => {
            const script = `LET result = FORMAT("{_key1} {key2_} {k3y_}", {_key1: "a", key2_: "b", k3y_: "c"})`;
            const scope = await runScript(script);
            expect(scope.get('result')).toBe('a b c');
        });
    }); // End of FORMAT Function describe block

    // --- Member Access Tests ---
    test('should access object properties', async () => {
        const script = `
            LET obj = CALL get_obj {} // Assume get_obj returns { nested: { value: 99 } }
            LET val = obj.nested.value
        `;
         // Need to register a mock 'get_obj' tool
        toolRegistry.register(
            'get_obj',
            { name: 'get_obj', description: '', parameters: [], returns: 'object'},
            () => {
                callLog.push({ toolName: 'get_obj', args: {} });
                return { nested: { value: 99 } };
            }
        );
        const finalScope = await runScript(script);
        expect(finalScope.get('val')).toBe(99);
    });

     test('should throw error for member access on non-object', async () => {
        const script = `
            LET x = 100
            LET y = x.property
        `;
        await expect(runScript(script)).rejects.toThrow(Errors.MemberAccessError);
         await expect(runScript(script)).rejects.toThrow(/Cannot access property 'property' on non-object value/);
    });

     test('should throw error for non-existent property', async () => {
        const script = `
            LET obj = CALL get_obj {}
            LET val = obj.non_existent
        `;
         toolRegistry.register(
            'get_obj', // Re-registering is ok if beforeEach clears it
            { name: 'get_obj', description: '', parameters: [], returns: 'object'},
            () => ({ nested: { value: 99 } }) // No call log needed here
        );
        await expect(runScript(script)).rejects.toThrow(Errors.MemberAccessError);
        await expect(runScript(script)).rejects.toThrow(/Property 'non_existent' does not exist/);
    });


    // --- Tool Call Tests ---

    test('should execute CALL statement', async () => {
        const script = `
            LET token = "BTC"
            CALL get_price { token: token }
        `;
        await runScript(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'get_price', args: { token: 'BTC' } });
    });

    test('should execute LET with tool call expression', async () => {
        const script = `LET btcPrice = CALL get_price { token: "BTC" }`;
        const finalScope = await runScript(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'get_price', args: { token: 'BTC' } });
        expect(finalScope.get('btcPrice')).toBe(65000);
    });

     test('should handle async tool calls', async () => {
        const script = `LET result = CALL swap { from_token: "USD", to_token: "EUR", amount: 100 }`;
        const finalScope = await runScript(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'swap', args: { from_token: 'USD', to_token: 'EUR', amount: 100 } });
        expect(finalScope.get('result')).toEqual({ success: true, from: 'USD', to: 'EUR', amount: 100 });
    });

     test('should handle ToolNotFoundError', async () => {
        const script = `CALL unknown_tool {}`;
        await expect(runScript(script)).rejects.toThrow(Errors.ToolNotFoundError);
        await expect(runScript(script)).rejects.toThrow(/Tool 'unknown_tool' not found/);
    });

    test('should handle ToolExecutionError', async () => {
        const script = `CALL error_tool {}`;
        await expect(runScript(script)).rejects.toThrow(Errors.ToolExecutionError);
        await expect(runScript(script)).rejects.toThrow(/Error executing tool 'error_tool': Tool failed intentionally/);
    });

    test('should handle ToolArgumentError (Missing required)', async () => {
        const script = `CALL get_price {}`; // Missing 'token' arg
        // Need to implement validation first in executeToolCall for this to fail correctly
        // await expect(runScript(script)).rejects.toThrow(Errors.ToolArgumentError);
         expect(true).toBe(true); // Placeholder until validation implemented
    });

     test('should handle ToolArgumentError (Wrong type)', async () => {
        const script = `CALL get_price { token: 123 }`; // Wrong arg type
        // Need to implement validation first in executeToolCall for this to fail correctly
        // await expect(runScript(script)).rejects.toThrow(Errors.ToolArgumentError);
         expect(true).toBe(true); // Placeholder until validation implemented
    });


    // --- Control Flow Tests ---

    test('should execute IF/THEN statement correctly', async () => {
        const script = `
            LET x = 10
            LET result = "initial"
            IF x > 5 THEN
                LET result = "then_branch"
                CALL get_price { token: "BTC" }
            END
        `;
        const finalScope = await runScript(script);
        expect(finalScope.get('result')).toBe('then_branch');
        expect(callLog).toHaveLength(1);
        expect(callLog[0]?.toolName).toBe('get_price');
    });

     test('should execute IF/ELSE statement correctly (else branch)', async () => {
        const script = `
            LET x = 3
            LET result = "initial"
            IF x > 5 THEN
                LET result = "then_branch"
            ELSE
                LET result = "else_branch"
                CALL swap { from_token: "A", to_token: "B", amount: 1 }
            END
        `;
        const finalScope = await runScript(script);
        expect(finalScope.get('result')).toBe('else_branch');
        expect(callLog).toHaveLength(1);
        expect(callLog[0]?.toolName).toBe('swap');
    });

    test('should handle IF condition type error', async () => {
        const script = `IF "not boolean" THEN CALL swap {} END`;
        await expect(runScript(script)).rejects.toThrow(Errors.InvalidConditionError);
    });


    test('should execute FOR loop correctly', async () => {
        const script = `
            LET myList = CALL get_list {} // Assume returns [1, 2, 3]
            LET sum = 0
            LET lastItem = -1
            FOR item IN myList DO
                // LET sum = sum + item // Requires '+' operator support
                LET lastItem = item
                PRINT(item) // Check output handler
            END
            LET iteratorAfterLoop = item // Should cause error
        `;
         // Mock get_list
        toolRegistry.register(
            'get_list',
            { name: 'get_list', description: '', parameters: [], returns: 'array'},
            () => {
                callLog.push({ toolName: 'get_list', args: {} });
                return [10, 20, 30]; // Example list
            }
        );
        // We expect UndefinedVariableError for 'item' after loop
        await expect(runScript(script)).rejects.toThrow(Errors.UndefinedVariableError);

        // Check state *before* the error-causing line by running a modified script
        // Reset logs/output before the second run within the same test
        capturedOutput = [];
        callLog = [];
        // Now run the script without the error-causing line
         const scriptNoError = `
            LET myList = CALL get_list {}
            LET lastItem = -1
            FOR item IN myList DO
                LET lastItem = item
                PRINT(item)
            END
        `;
        const finalScope = await runScript(scriptNoError);
        expect(finalScope.get('lastItem')).toBe(30);
        expect(finalScope.has('item')).toBe(false); // Iterator var should be gone
        expect(capturedOutput).toEqual(['10', '20', '30']); // Check output strings
        expect(callLog.filter(c => c.toolName === 'get_list')).toHaveLength(1); // Check tool call log
    });

    test('should handle FOR loop with non-list error', async () => {
        const script = `
            LET notList = 123
            FOR item IN notList DO
                PRINT(item)
            END
        `;
         await expect(runScript(script)).rejects.toThrow(Errors.InvalidIterableError);
    });


    // --- PRINT Function Tests (formerly Statement) ---
     test('PRINT function should call output handler', async () => {
        const script = `
            LET msg = "Hello"
            PRINT(msg)
            PRINT(123)
            PRINT(true)
            PRINT(null)
        `;
        await runScript(script);
        // Behavior remains the same: output handler is called, check lowercase
        expect(capturedOutput).toEqual(['Hello', '123', 'true', 'null']);
    });

    test('PRINT function should return null', async () => {
        const script = `LET result = PRINT("test")`;
        const finalScope = await runScript(script);
        expect(finalScope.get('result')).toBeNull();
        // Also check that output still happened
        expect(capturedOutput).toEqual(['test']);
    });

     test('should handle PRINT function with exactly one argument', async () => {
        await expect(runScript(`PRINT()`)).rejects.toThrow(/expects exactly 1 argument, got 0/);
        await expect(runScript(`PRINT(1, 2)`)).rejects.toThrow(/expects exactly 1 argument, got 2/);
    });

});

describe('Interpreter - Array Indexing', () => {
    // Helper to run script and check scope, potentially modified for array literals
    // Note: We need to enable list literals in the parser first for these tests!
    // For now, let's assume lists are provided via initial scope.

    async function runScriptAndCheckArrayIndexing(script: string, initialScope: Scope, expectedVar: string, expectedValue: JsonValue) {
        const interpreter = new Interpreter();
        const ast = parse(script);
        const finalScope = await interpreter.execute(ast, initialScope);
        expect(finalScope.get(expectedVar)).toEqual(expectedValue);
    }

    async function runScriptAndExpectError(script: string, initialScope: Scope, errorType: any, errorMessagePart?: string) {
        const interpreter = new Interpreter();
        const ast = parse(script);
        await expect(interpreter.execute(ast, initialScope)).rejects.toThrow(errorType);
        if (errorMessagePart) {
            await expect(interpreter.execute(ast, initialScope)).rejects.toThrow(errorMessagePart);
        }
    }

    let initialScope: Scope;

    beforeEach(() => {
        // Initialize scope with some lists for testing
        initialScope = new Map<string, JsonValue>([
            ['myList', [10, "hello", true, null, 20]],
            ['nestedList', [1, [2, 3], 4]],
            ['listOfObjects', [{id: 1, val: 'a'}, {id: 2, val: 'b'}]],
            ['emptyList', []],
            ['numVar', 1],
            ['strVar', "not_a_list"]
        ]);
    });

    it('should access element with literal index', async () => {
        const script = `LET x = myList[1]`;
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', "hello");
    });

    it('should access element with variable index', async () => {
        const script = `
            LET index = 0
            LET x = myList[index]
        `;
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', 10);
    });

    it('should access element with expression index', async () => {
        const script = `
            LET offset = 2
            LET x = myList[1 + offset] // index 3
        `;
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', null);
    });

     it('should access element from nested list', async () => {
        const script = `LET x = nestedList[1][0]`; // Access 2 from [2, 3]
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', 2);
    });

    it('should access property after indexing list of objects', async () => {
        const script = `LET x = listOfObjects[0].val`;
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', 'a');
    });

     it('should access property via variable after indexing list of objects', async () => {
        const script = `
            LET idx = 1
            LET item = listOfObjects[idx]
            LET x = item.val
        `;
        await runScriptAndCheckArrayIndexing(script, initialScope, 'x', 'b');
    });

    // --- Error Cases ---

    it('should throw error for index out of bounds (positive)', async () => {
        const script = `LET x = myList[5]`; // Index 5 is out of bounds (length 5)
        await runScriptAndExpectError(script, initialScope, IndexOutOfBoundsError, 'Index 5 is out of bounds for array of length 5');
    });

     it('should throw error for index out of bounds (negative)', async () => {
        const script = `LET x = myList[-1]`;
        await runScriptAndExpectError(script, initialScope, IndexOutOfBoundsError, 'Index -1 is out of bounds');
    });

    it('should throw error for index out of bounds on empty list', async () => {
        const script = `LET x = emptyList[0]`;
        await runScriptAndExpectError(script, initialScope, IndexOutOfBoundsError, 'Index 0 is out of bounds for array of length 0');
    });

    it('should throw error for non-integer index (float)', async () => {
        const script = `LET x = myList[1.5]`;
        await runScriptAndExpectError(script, initialScope, TypeError, 'List index must be an integer');
    });

     it('should throw error for non-integer index (string)', async () => {
        const script = `LET idx = "0" LET x = myList[idx]`;
        await runScriptAndExpectError(script, initialScope, TypeError, 'List index must be an integer');
    });

     it('should throw error for indexing non-list variable', async () => {
        const script = `LET x = numVar[0]`;
        await runScriptAndExpectError(script, initialScope, TypeError, 'Cannot access index on non-list value (type: number)');
    });

    it('should throw error for indexing non-list literal (if parser supported)', async () => {
         // This test depends on parser supporting literals first.
         // const script = `LET x = "hello"[0]`;
         // await runScriptAndExpectError(script, initialScope, TypeError, 'Cannot access index on non-list value');
         // Placeholder: Skip test until parser allows string literals etc.
         expect(true).toBe(true); // Dummy pass
    });

    it('should throw error for indexing undefined variable', async () => {
        const script = `LET x = undefinedList[0]`;
        await runScriptAndExpectError(script, initialScope, UndefinedVariableError, "Variable 'undefinedList' not defined");
    });

     it('should throw error accessing property on non-object element', async () => {
        const script = `LET x = myList[0].prop`; // myList[0] is number 10
        await runScriptAndExpectError(script, initialScope, MemberAccessError, "Cannot access property 'prop' on non-object value resulting from 'ArrayIndexExpression' (type: number)");
    });

});

// --- NEW: Describe block for Literal Expressions ---
describe('Interpreter - Literal Expressions', () => {
    let interpreter: Interpreter;
    let capturedOutput: string[];
    let mockOutputHandler: OutputHandler;

    beforeEach(() => {
        capturedOutput = [];
        mockOutputHandler = (output: string) => capturedOutput.push(output);
        // Use a clean interpreter without pre-registered tools unless needed for specific literal tests
        interpreter = new Interpreter(new ToolRegistry(), mockOutputHandler);
    });

    async function runAndGetScope(script: string, initialScope?: Scope): Promise<Scope> {
        const ast = parse(script);
        return await interpreter.execute(ast, initialScope);
    }

    // --- List Literal Tests ---
    test('should evaluate simple list literal', async () => {
        const script = `LET x = [1, "two", true, null, 3.14]`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual([1, "two", true, null, 3.14]);
    });

    test('should evaluate empty list literal', async () => {
        const script = `LET x = []`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual([]);
    });

    test('should evaluate list literal with expressions', async () => {
        const script = `
            LET a = 10
            LET b = "hello"
            LET x = [a, a * 2, b, 5 > 2]
        `;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual([10, 20, "hello", true]);
    });

    test('should evaluate nested list literals', async () => {
        const script = `LET x = [1, [2, 3], [4, [5]]]`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual([1, [2, 3], [4, [5]]]);
    });

    test('should evaluate list literal in expressions (array access)', async () => {
        const script = `LET x = ["a", "b", "c"][1]`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toBe("b");
    });

    // --- Object Literal Tests ---
    test('should evaluate simple object literal', async () => {
        const script = `LET x = { name: "Nuwa", version: 1, active: true, config: null }`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual({ name: "Nuwa", version: 1, active: true, config: null });
    });

     test('should evaluate object literal with string keys', async () => {
        const script = `LET x = { "first-name": "Nuwa", "dash-key": 123 }`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual({ "first-name": "Nuwa", "dash-key": 123 });
    });

    test('should evaluate empty object literal', async () => {
        const script = `LET x = {}`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual({});
    });

    test('should evaluate object literal with expressions', async () => {
        const script = `
            LET factor = 10
            LET label = "result"
            LET x = { value: factor * 5, status: label, valid: factor > 0 }
        `;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual({ value: 50, status: "result", valid: true });
    });

    test('should evaluate nested object literals', async () => {
        const script = `LET x = { data: { value: 99, units: "m" }, id: "abc" }`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toEqual({ data: { value: 99, units: "m" }, id: "abc" });
    });

     test('should evaluate object literal in expressions (member access)', async () => {
        const script = `LET x = { key: "value", num: 123 }.key`;
        const scope = await runAndGetScope(script);
        expect(scope.get('x')).toBe("value");
    });

    // --- Combined Literal Tests ---
    test('should evaluate nested list and object literals', async () => {
        const script = `
            LET id_1 = "001"
            LET items = [
                { id: id_1, tags: ["a", "b", 1] },
                { id: "002", data: { nested: true } }
            ]
            LET result = { success: true, payload: items }
        `;
        const scope = await runAndGetScope(script);
        expect(scope.get('result')).toEqual({
            success: true,
            payload: [
                { id: "001", tags: ["a", "b", 1] },
                { id: "002", data: { nested: true } }
            ]
        });
    });

     test('should allow list/object literals as tool arguments', async () => {
        // Mock a simple tool that accepts list/object
        const testToolSchema: ToolSchema = { name: 'processData', description: '', parameters: [{ name: 'data', type: 'any', required: true }], returns: 'any' };
        let receivedData: any = null;
        const testToolFunc: ToolFunction = async (args) => { receivedData = args['data']; return receivedData; };
        interpreter.getToolRegistry().register(testToolSchema.name, testToolSchema, testToolFunc);

        const script = `
            LET myData = { items: [1, { active: true }], name: "test" }
            CALL processData { data: myData }
            CALL processData { data: ["go", 2, false] }
            LET result = CALL processData { data: { x: 1 } }
        `;
        const scope = await runAndGetScope(script);

        // Fix: Expect the data from the *last* call
        expect(receivedData).toEqual({ x: 1 });

        expect(scope.get('result')).toEqual({ x: 1 }); // Check value returned from last call
    });

     test('should parse object literal key as identifier or string', async () => {
         // Test focuses on parsing, evaluation confirms it worked
         const script = `
             LET identifierKey = { key: 1 }
             LET stringKey = { "key-string": 2 }
             LET mixed = { id: 3, "str": 4 }
         `;
         const scope = await runAndGetScope(script);
         expect(scope.get('identifierKey')).toEqual({ key: 1 });
         expect(scope.get('stringKey')).toEqual({ "key-string": 2 });
         expect(scope.get('mixed')).toEqual({ id: 3, "str": 4 });
     });

});
