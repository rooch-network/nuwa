import { Interpreter, OutputHandler, Scope } from '../src/interpreter';
import { parse } from '../src/parser';
import { ToolRegistry, ToolSchema, ToolFunction } from '../src/tools';
import { JsonValue } from '../src/values';

// --- Mock Tools Setup ---

export interface MockCallLog {
    toolName: string;
    args: Record<string, JsonValue | undefined>;
}

// Simple synchronous tool example
export const mockGetPrice: ToolFunction = (args, context) => {
    if (args['token'] === 'BTC') return 65000;
    if (args['token'] === 'ETH') return 3500;
    return null;
};
export const getPriceSchema: ToolSchema = {
    name: 'get_price', description: 'Get crypto price',
    parameters: [{ name: 'token', type: 'string', required: true }],
    returns: 'number' // Can also return null
};

// Asynchronous tool example
export const mockSwap: ToolFunction = async (args, context) => {
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
export const swapSchema: ToolSchema = {
    name: 'swap', description: 'Swap tokens',
    parameters: [
        { name: 'from_token', type: 'string', required: true },
        { name: 'to_token', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true },
    ],
    returns: 'object'
};

// Tool that intentionally throws an error
export const mockErrorTool: ToolFunction = (args, context) => {
    throw new Error("Tool failed intentionally");
};
export const errorToolSchema: ToolSchema = {
    name: 'error_tool', description: 'This tool always fails', parameters: [], returns: 'any'
};

// Mock list returning tool for FOR loops
export const mockGetList: ToolFunction = (args, context) => {
    return [10, 20, 30]; // Example list
};
export const getListSchema: ToolSchema = {
    name: 'get_list', description: 'Returns a list', parameters: [], returns: 'array'
};

// Mock object returning tool for member access tests
export const mockGetObj: ToolFunction = (args, context) => {
    return { nested: { value: 99 } };
};
export const getObjSchema: ToolSchema = {
    name: 'get_obj', description: 'Returns an object', parameters: [], returns: 'object'
};


// --- Core runScript Helper ---
// Moved from interpreter.test.ts, now accepts context as arguments

/**
 * Executes a NuwaScript string using a provided context.
 * @param scriptText The NuwaScript code.
 * @param toolRegistry The ToolRegistry instance for this run.
 * @param outputHandler The OutputHandler instance for this run.
 * * @param initialScope Optional initial variable scope as a Record.
 * @returns A Promise resolving to the final variable scope (Map).
 */
export async function runScript(
    scriptText: string,
    toolRegistry: ToolRegistry,
    outputHandler: OutputHandler,
    initialScope?: Record<string, JsonValue>
): Promise<Scope> {
    const interpreter = new Interpreter(toolRegistry, outputHandler);
    const ast = parse(scriptText);
    return await interpreter.execute(ast, initialScope);
}

// --- Setup Helper (Optional but recommended) ---

/**
 * Sets up the common context for interpreter tests.
 * @returns An object containing initialized toolRegistry, mockOutputHandler, capturedOutput array, and callLog array.
 */
export function setupTestContext(): {
    toolRegistry: ToolRegistry;
    mockOutputHandler: OutputHandler;
    capturedOutput: string[];
    callLog: MockCallLog[];
} {
    const toolRegistry = new ToolRegistry();
    const capturedOutput: string[] = [];
    const callLog: MockCallLog[] = [];
    const mockOutputHandler: OutputHandler = (output: string) => {
        capturedOutput.push(output);
    };

    // Register common mock tools needed across different test files
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
    // Register other common tools if needed (e.g., get_list, get_obj)
    toolRegistry.register(getListSchema.name, getListSchema, (args, context) => {
        callLog.push({ toolName: getListSchema.name, args });
        return mockGetList(args, context);
    });
    toolRegistry.register(getObjSchema.name, getObjSchema, (args, context) => {
        callLog.push({ toolName: getObjSchema.name, args });
        return mockGetObj(args, context);
    });


    return { toolRegistry, mockOutputHandler, capturedOutput, callLog };
} 