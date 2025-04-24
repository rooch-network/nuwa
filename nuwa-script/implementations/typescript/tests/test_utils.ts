import { Interpreter, OutputHandler, Scope } from '../src/interpreter';
import { parse } from '../src/parser';
// Import necessary types including Zod and JSONSchema ones
import {
    ToolRegistry,
    ToolSchema, // Keep this for defining schemas before normalization
    ToolFunction,
    NormalizedToolSchema,
    SchemaInput,
    EvaluatedToolArguments
} from '../src/tools';
import { JsonValue } from '../src/values';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

// --- Mock Tools Setup ---

export interface MockCallLog {
    toolName: string;
    args: EvaluatedToolArguments; // Use EvaluatedToolArguments type
}

// Simple synchronous tool example
export const mockGetPrice: ToolFunction = (args) => { // Removed context
    if (args['token'] === 'BTC') return 65000;
    if (args['token'] === 'ETH') return 3500;
    return null;
};
// Update schema to use JSON Schema format and new ToolSchema structure
export const getPriceSchemaDef: ToolSchema = {
    name: 'get_price',
    description: 'Get crypto price',
    parameters: { // Use JSON Schema Object
        type: 'object',
        properties: {
            token: { type: 'string', description: 'Crypto token symbol' }
        },
        required: ['token'],
        additionalProperties: false
    },
    returns: { // Use returns object with schema
        description: 'Price in USD or null if not found',
        schema: { type: ['number', 'null'] } // JSON Schema definition
    }
};

// Asynchronous tool example
export const mockSwap: ToolFunction = async (args) => { // Removed context
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
        success: true,
        from: args['from_token'],
        to: args['to_token'],
        amount: args['amount']
    } as JsonValue;
};
export const swapSchemaDef: ToolSchema = {
    name: 'swap',
    description: 'Swap tokens',
    parameters: { // Use JSON Schema Object
        type: 'object',
        properties: {
            from_token: { type: 'string' },
            to_token: { type: 'string' },
            amount: { type: 'number' }
        },
        required: ['from_token', 'to_token', 'amount'],
        additionalProperties: false
    },
    returns: { // Use returns object with schema
        description: 'Object indicating swap result',
        schema: { // JSON Schema definition for the return object
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                from: { type: 'string' },
                to: { type: 'string' },
                amount: { type: 'number' }
            },
            required: ['success', 'from', 'to', 'amount'],
            additionalProperties: false
        }
    }
};

// Tool that intentionally throws an error
export const mockErrorTool: ToolFunction = (args) => { // Removed context
    throw new Error("Tool failed intentionally");
};
export const errorToolSchemaDef: ToolSchema = {
    name: 'error_tool',
    description: 'This tool always fails',
    parameters: { type: 'object', properties: {} }, // Empty JSON Schema object
    returns: { // Use returns object with schema
        description: 'Never returns successfully',
        schema: {} // Empty schema implies any
    }
};

// Mock list returning tool for FOR loops
export const mockGetList: ToolFunction = (args) => { // Removed context
    return [10, 20, 30];
};
export const getListSchemaDef: ToolSchema = {
    name: 'get_list',
    description: 'Returns a list',
    parameters: { type: 'object', properties: {} },
    returns: { // Use returns object with schema
        description: 'A list of numbers',
        schema: { type: 'array', items: { type: 'number' } } // JSON Schema definition
    }
};

// Mock object returning tool for member access tests
export const mockGetObj: ToolFunction = (args) => { // Removed context
    return { nested: { value: 99 } };
};
export const getObjSchemaDef: ToolSchema = {
    name: 'get_obj',
    description: 'Returns an object',
    parameters: { type: 'object', properties: {} },
    returns: { // Use returns object with schema
        description: 'An object with nested structure',
        schema: { // JSON Schema definition
            type: 'object',
            properties: {
                nested: {
                    type: 'object',
                    properties: { value: { type: 'number' } }
                }
            }
        }
    }
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
    return await interpreter.executeScript(scriptText, initialScope);
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

    // Register common mock tools using the NEW register signature
    // Pass the schema definition object directly as the first argument
    toolRegistry.register( getPriceSchemaDef, (args) => {
        callLog.push({ toolName: getPriceSchemaDef.name, args });
        return mockGetPrice(args);
    });
    toolRegistry.register( swapSchemaDef, async (args) => {
         callLog.push({ toolName: swapSchemaDef.name, args });
         return await mockSwap(args);
    });
     toolRegistry.register( errorToolSchemaDef, (args) => {
         callLog.push({ toolName: errorToolSchemaDef.name, args });
         return mockErrorTool(args);
    });
    toolRegistry.register( getListSchemaDef, (args) => {
        callLog.push({ toolName: getListSchemaDef.name, args });
        return mockGetList(args);
    });
    toolRegistry.register( getObjSchemaDef, (args) => {
        callLog.push({ toolName: getObjSchemaDef.name, args });
        return mockGetObj(args);
    });

    return { toolRegistry, mockOutputHandler, capturedOutput, callLog };
} 