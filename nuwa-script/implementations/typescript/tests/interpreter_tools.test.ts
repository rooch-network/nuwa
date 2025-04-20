import { describe, test, expect, beforeEach } from '@jest/globals';
import { Scope, Interpreter, OutputHandler } from '../src/interpreter';
import { ToolRegistry } from '../src/tools';
import { JsonValue } from '../src/values';
import * as Errors from '../src/errors';
import { setupTestContext, runScript, MockCallLog } from './test_utils'; // Import helpers

describe('Interpreter - Tool Calls', () => {
    let toolRegistry: ToolRegistry;
    let capturedOutput: string[];
    let mockOutputHandler: OutputHandler;
    let callLog: MockCallLog[];
    let runScriptInContext: (scriptText: string, initialScope?: Record<string, JsonValue>) => Promise<Scope>;

    beforeEach(() => {
        const context = setupTestContext(); // Uses the setup which includes mock tools
        toolRegistry = context.toolRegistry;
        capturedOutput = context.capturedOutput;
        mockOutputHandler = context.mockOutputHandler;
        callLog = context.callLog;
        runScriptInContext = (scriptText, initialScope) =>
            runScript(scriptText, toolRegistry, mockOutputHandler, initialScope);
    });

    test('should execute CALL statement', async () => {
        const script = `
            LET token = "BTC"
            CALL get_price { token: token }
        `;
        await runScriptInContext(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'get_price', args: { token: 'BTC' } });
    });

    test('should execute LET with tool call expression', async () => {
        const script = `LET btcPrice = CALL get_price { token: "BTC" }`;
        const finalScope = await runScriptInContext(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'get_price', args: { token: 'BTC' } });
        expect(finalScope.get('btcPrice')).toBe(65000);
    });

    test('should handle async tool calls', async () => {
        const script = `LET result = CALL swap { from_token: "USD", to_token: "EUR", amount: 100 }`;
        const finalScope = await runScriptInContext(script);
        expect(callLog).toHaveLength(1);
        expect(callLog[0]).toEqual({ toolName: 'swap', args: { from_token: 'USD', to_token: 'EUR', amount: 100 } });
        expect(finalScope.get('result')).toEqual({ success: true, from: 'USD', to: 'EUR', amount: 100 });
    });

    test('should handle ToolNotFoundError', async () => {
        const script = `CALL unknown_tool {}`;
        await expect(runScriptInContext(script)).rejects.toThrow(Errors.ToolNotFoundError);
        await expect(runScriptInContext(script)).rejects.toThrow(/Tool 'unknown_tool' not found/);
    });

    test('should handle ToolExecutionError', async () => {
        const script = `CALL error_tool {}`;
        await expect(runScriptInContext(script)).rejects.toThrow(Errors.ToolExecutionError);
        await expect(runScriptInContext(script)).rejects.toThrow(/Error executing tool 'error_tool': Tool failed intentionally/);
    });

    test('should handle ToolArgumentError (Missing required)', async () => {
        const script = `CALL get_price {}`; // Missing 'token' arg
        await expect(runScriptInContext(script)).rejects.toThrow(Errors.ToolArgumentError);
        await expect(runScriptInContext(script)).rejects.toThrow(/Missing required parameter 'token'/);
    });

    test('should handle ToolArgumentError (Wrong type - though not currently checked by default)', async () => {
        // Note: Current interpreter doesn't do strict type checking on evaluated args *before* calling the tool function itself.
        // The mock tool might implicitly handle it or fail. A stricter interpreter *could* check this.
        // This test primarily ensures the call proceeds far enough.
        const script = `CALL get_price { token: 123 }`; // Wrong arg type for mock
        // Our mockGetPrice will return null in this case, which is a valid JsonValue
        const finalScope = await runScriptInContext(script);
        expect(finalScope).toBeDefined(); // Call succeeded, even if result isn't useful
        // If type validation were added BEFORE tool execution:
        // await expect(runScriptInContext(script)).rejects.toThrow(Errors.ToolArgumentError);
    });
}); 