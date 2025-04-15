import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import readline from 'readline';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Interpreter, OutputHandler } from '../src/interpreter';
import { parse } from '../src/parser';
import { ToolRegistry, ToolSchema, ToolFunction, ToolContext, StateMetadata, StateValueWithMetadata } from '../src/tools';
import { Scope } from '../src/interpreter';
import { NuwaValue } from '../src/values';
import * as Errors from '../src/errors';
import { buildPrompt } from '../src/prompts';

// --- Configuration ---
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o"; // Or "gpt-3.5-turbo", etc.
const MAX_TOKENS = 1000;

/**
 * Helper function to create state entries with metadata
 */
function createState<T extends NuwaValue>(
  value: T, 
  description: string, 
  formatter?: (value: NuwaValue) => string
): StateValueWithMetadata {
  return {
    value,
    metadata: {
      description,
      formatter
    }
  };
}

// Function to apply state with metadata to a tool registry or context
function applyStateWithMetadata(
    registry: ToolRegistry | ToolContext, 
    key: string, 
    stateWithMetadata: StateValueWithMetadata
): void {
    if (registry instanceof ToolRegistry) {
        // Direct application to a registry
        registry.setState(key, stateWithMetadata);
    } else {
        // Application to a tool context's state
        registry.state.set(key, stateWithMetadata.value);
        
        // We need to find the registry to set metadata
        // This is a workaround since we don't have direct registry access in tools
        const globalRegistry = (global as any).__toolRegistry;
        if (globalRegistry && stateWithMetadata.metadata) {
            globalRegistry.registerStateMetadata(key, stateWithMetadata.metadata);
        }
    }
}

// --- Mock Tools Definition ---
const MOCK_TOOLS: Array<{ schema: ToolSchema, execute: ToolFunction }> = [
    {
        schema: {
            name: 'get_current_btc_price',
            description: 'Retrieves the current price of Bitcoin (BTC) in USD.',
            parameters: [],
            returns: 'number'
        },
        execute: async (args, context) => {
            console.log('[Tool Call] get_current_btc_price()');
            // Simulate API call delay and return a mock price
            await new Promise(res => setTimeout(res, 50));
            
            // Store the last retrieved price in the state with metadata
            if (context) {
                context.state.set('last_btc_price_time', Date.now());
                const priceWithMetadata = createState(
                    68500.75,
                    "The most recent Bitcoin price in USD",
                    (value) => `$${value} USD`
                );
                context.state.set('last_btc_price_value', priceWithMetadata.value);
                if (priceWithMetadata.metadata && (global as any).__toolRegistry) {
                    (global as any).__toolRegistry.registerStateMetadata('last_btc_price_value', priceWithMetadata.metadata);
                }
            }
            
            return 68500.75;
        }
    },
    {
        schema: {
            name: 'get_user_preferences',
            description: 'Retrieves user preferences.',
            parameters: [
                { name: 'user_id', type: 'string', required: true, description: 'The user ID to retrieve preferences for.' }
            ],
            returns: 'object'
        },
        execute: async (args, context) => {
            const userId = args['user_id'];
            console.log(`[Tool Call] get_user_preferences(user_id: "${userId}")`);
            
            // Simulate API call delay
            await new Promise(res => setTimeout(res, 50));
            
            // Return mock user preferences
            const preferences = {
                theme: "dark",
                currency: "USD",
                notifications: true,
                cryptoFavorites: ["BTC", "ETH", "SOL"]
            };
            
            // Store last accessed user in state with metadata
            if (context) {
                const userIdWithMetadata = createState(
                    userId || "unknown",  // 提供默认值
                    "The ID of the user whose data was most recently accessed"
                );
                context.state.set('last_accessed_user', userIdWithMetadata.value);
                if (userIdWithMetadata.metadata && (global as any).__toolRegistry) {
                    (global as any).__toolRegistry.registerStateMetadata('last_accessed_user', userIdWithMetadata.metadata);
                }
                context.state.set('user_preferences', preferences);
            }
            
            return preferences;
        }
    },
    {
        schema: {
            name: 'report_analysis_result',
            description: 'Reports the final analysis result or message to the user.',
            parameters: [
                { name: 'message', type: 'string', required: true, description: 'The message to report.' },
                { name: 'is_urgent', type: 'boolean', required: false, description: 'Whether the report is urgent.' }
            ],
            returns: 'boolean' // Indicate success
        },
        execute: async (args, context) => {
            const message = args['message'] as string;
            const urgency = args['is_urgent'] ? 'URGENT' : 'Normal';
            console.log(`[Tool Call] report_analysis_result(message: "${message}", is_urgent: ${args['is_urgent'] ?? false})`);
            console.log(`\n--- FINAL REPORT (${urgency}) ---`);
            console.log(`${message}`);
            console.log(`--------------------------\n`);
            
            // Increment report count in state with metadata
            if (context) {
                const currentCount = context.state.get('report_count') as number || 0;
                const countWithMetadata = createState(
                    currentCount + 1,
                    "Number of reports generated in this session"
                );
                context.state.set('report_count', countWithMetadata.value);
                if (countWithMetadata.metadata && (global as any).__toolRegistry) {
                    (global as any).__toolRegistry.registerStateMetadata('report_count', countWithMetadata.metadata);
                }
                context.state.set('last_report_time', Date.now());
                context.state.set('last_report_message', message);
            }
            
            await new Promise(res => setTimeout(res, 20)); // Simulate action
            return true;
        }
    },
    {
        schema: {
            name: 'get_conversation_history',
            description: 'Retrieves the conversation history with a specific user.',
            parameters: [
                { name: 'user_id', type: 'string', required: true, description: 'The user ID to retrieve conversation history for.' }
            ],
            returns: 'list'
        },
        execute: async (args, context) => {
            const userId = args['user_id'] as string;
            console.log(`[Tool Call] get_conversation_history(user_id: "${userId}")`);
            
            // Simulate API call delay
            await new Promise(res => setTimeout(res, 50));
            
            // Use state to check if this user was the last accessed user
            let extraMessage = "";
            if (context && context.state.get('last_accessed_user') === userId) {
                extraMessage = "We were just talking about your preferences.";
            }
            
            // Return mock conversation history
            const history = [
                { timestamp: Date.now() - 86400000, message: "Hello, how can I help you today?" },
                { timestamp: Date.now() - 86300000, message: "I'm interested in cryptocurrency investments." },
                { timestamp: Date.now() - 86200000, message: "I can provide you with information on various cryptocurrencies." },
                { timestamp: Date.now() - 1000, message: extraMessage }
            ].filter(item => Boolean(item.message)); // Filter out empty messages
            
            // Store conversation context in state with metadata
            if (context && userId) {  // 确保userId不为undefined
                const historyFlagWithMetadata = createState(
                    true,
                    "Indicates whether conversation history exists for the current user"
                );
                context.state.set('has_conversation_history', historyFlagWithMetadata.value);
                if (historyFlagWithMetadata.metadata && (global as any).__toolRegistry) {
                    (global as any).__toolRegistry.registerStateMetadata('has_conversation_history', historyFlagWithMetadata.metadata);
                }
                
                const topicWithMetadata = createState(
                    'cryptocurrency',
                    "The main topic of the current conversation"
                );
                context.state.set('conversation_topic', topicWithMetadata.value);
                if (topicWithMetadata.metadata && (global as any).__toolRegistry) {
                    (global as any).__toolRegistry.registerStateMetadata('conversation_topic', topicWithMetadata.metadata);
                }
            }
            
            return history;
        }
    }
    // Add more mock tools as needed
];

// --- Helper Functions ---

/**
 * Extracts NuwaScript code from LLM response, removing potential markdown fences.
 */
function extractNuwaScript(rawResponse: string): string {
    const match = rawResponse.match(/```(?:nuwa|nuwascript)?\s*([\s\S]*?)\s*```|([\s\S]*)/);
    if (match && match[1]) {
        return match[1].trim(); // Content within fences
    }
    if (match && match[2]) {
        return match[2].trim(); // Raw content if no fences
    }
    return rawResponse.trim(); // Fallback
}


// --- Main Execution Logic ---

async function processTask(userTask: string, toolRegistry: ToolRegistry, openai: OpenAI) {
    console.log(`\nProcessing Task: "${userTask}"`);

    // 1. Format Prompt (now includes state information)
    const prompt = buildPrompt(toolRegistry, userTask, true);
    console.log("\n--- Generating Prompt ---"); // Optional: Log prompt
    console.log(prompt);
    console.log("-----------------------\n");

    // 2. Call OpenAI API
    let generatedScript = '';
    try {
        console.log(`Calling OpenAI (${OPENAI_MODEL})...`);
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                 { role: "system", content: "You are an AI assistant generating NuwaScript code." },
                 { role: "user", content: prompt }
            ],
            max_tokens: MAX_TOKENS,
            temperature: 0.2,
        });
        const rawResponse = completion.choices[0]?.message?.content;
        if (!rawResponse) throw new Error("OpenAI response content is empty.");
        console.log("--- Raw OpenAI Response ---\n", rawResponse, "\n---------------------------");
        generatedScript = extractNuwaScript(rawResponse);
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        return; // Stop processing this task
    }

    if (!generatedScript) {
        console.error("LLM did not generate any script content.");
        return;
    }

    console.log("\n--- Generated NuwaScript ---\n", generatedScript, "\n--------------------------");

    // 3. Initialize Interpreter and Execute
    const capturedOutput: string[] = [];
    const interpreter = new Interpreter(toolRegistry, (output) => {
        console.log(`[NuwaScript PRINT]: ${output}`);
        capturedOutput.push(output);
    });

    console.log("\nExecuting NuwaScript...");
    let finalScope: Scope | null = null;
    let executionError: Error | null = null;

    try {
        const ast = parse(generatedScript);
        finalScope = await interpreter.execute(ast);
        console.log("Script execution finished successfully.");
    } catch (error: any) {
        console.error("\n--- NuwaScript Execution Failed ---");
        if (error instanceof Errors.InterpreterError) { console.error(`Interpreter Error: ${error.message}`); }
        else if (error instanceof Error) { console.error(`Error: ${error.message}\n${error.stack}`); }
        else { console.error("An unknown error occurred:", error); }
        executionError = error;
        console.log("---------------------------------\n");
    }

    // 4. Display Results
    console.log("\n--- Execution Summary ---");
    console.log("Captured Output (PRINT):", capturedOutput);
    if (finalScope) console.log("Final Variables:", Object.fromEntries(finalScope));
    console.log("Execution Status:", executionError ? "FAILED" : "SUCCESS");
    
    // 5. Display current state
    console.log("\n--- Current System State ---");
    console.log(toolRegistry.formatStateForPrompt());
    console.log("---------------------------\n");
}

async function main() {
    console.log("Starting NuwaScript Interactive Example with State Management...");
    console.log("Enter your task, or type 'exit'/'quit' to end.");

    // Setup Tool Registry (shared across interactions)
    const toolRegistry = new ToolRegistry();
    // Store the registry globally so tools can access it
    (global as any).__toolRegistry = toolRegistry;
    
    const toolLog: Array<{ toolName: string; args: Record<string, NuwaValue>}> = []; // Log can be shared too
    MOCK_TOOLS.forEach(tool => {
        toolRegistry.register(tool.schema.name, tool.schema, async (args, context) => {
            console.log(`[Tool Call Log] ${tool.schema.name}(${JSON.stringify(args)})`);
            toolLog.push({ toolName: tool.schema.name, args });
            return await tool.execute(args, context);
        });
    });
    
    // Initialize some basic state with metadata
    const sessionTimeWithMetadata = createState(
        Date.now(),
        "Timestamp when this session started",
        (value) => {
            const date = new Date(value as number);
            return `${value} (${date.toLocaleString()})`;
        }
    );
    toolRegistry.setState('session_start_time', sessionTimeWithMetadata);
    
    // Set state first, then register metadata separately
    toolRegistry.setState('interactions_count', 0);
    toolRegistry.registerStateMetadata('interactions_count', {
        description: "Number of interactions in this session"
    });
    
    console.log("Tool registry initialized with state management.");
    console.log("Initial state:", toolRegistry.formatStateForPrompt());

    // Setup OpenAI client (shared)
    if (!process.env.OPENAI_API_KEY) {
        console.error("ERROR: OPENAI_API_KEY environment variable not set.");
        process.exit(1);
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Setup readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Function to ask questions recursively
    const askQuestion = () => {
        rl.question('\nEnter your task: ', async (userTask) => {
            const trimmedTask = userTask.trim().toLowerCase();
            if (trimmedTask === 'exit' || trimmedTask === 'quit') {
                console.log('Exiting...');
                rl.close(); // Close the interface
                return; // Stop the loop
            }

            if (userTask.trim()) {
                // Increment interaction count in state
                const currentCount = toolRegistry.getStateValue('interactions_count') as number || 0;
                toolRegistry.setState('interactions_count', currentCount + 1);
                
                // Store user query with metadata
                const queryWithMetadata = createState(
                    userTask.trim(),
                    "The most recent user query"
                );
                toolRegistry.setState('last_query', queryWithMetadata);
                
                const queryTimeWithMetadata = createState(
                    Date.now(),
                    "Timestamp of the most recent user query"
                );
                toolRegistry.setState('last_query_time', queryTimeWithMetadata);
                
                // Process the valid task
                await processTask(userTask.trim(), toolRegistry, openai);
            } else {
                console.log("Task cannot be empty.");
            }

            // Ask the next question
            askQuestion();
        });
    };

    // Start the interaction loop
    askQuestion();

    // Handle CTRL+C
    rl.on('close', () => {
        console.log('\nGoodbye!');
        process.exit(0);
    });
}

// Run the main function
main().catch(error => {
    console.error("Unhandled error in main function:", error);
    process.exit(1);
});
