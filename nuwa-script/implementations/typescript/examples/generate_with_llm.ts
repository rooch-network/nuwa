import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import readline from 'readline';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Interpreter, OutputHandler } from '../src/interpreter';
import { parse } from '../src/parser';
import { ToolRegistry, ToolSchema, ToolFunction } from '../src/tools';
import { Scope } from '../src/interpreter';
import { NuwaValue } from '../src/values';
import * as Errors from '../src/errors';
import { buildPrompt } from '../src/prompts';

// --- Configuration ---
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o"; // Or "gpt-3.5-turbo", etc.
const MAX_TOKENS = 1000;

// --- Mock Tools Definition ---
const MOCK_TOOLS: Array<{ schema: ToolSchema, execute: ToolFunction }> = [
    {
        schema: {
            name: 'get_current_btc_price',
            description: 'Retrieves the current price of Bitcoin (BTC) in USD.',
            parameters: [],
            returns: 'number'
        },
        execute: async () => {
            console.log('[Tool Call] get_current_btc_price()');
            // Simulate API call delay and return a mock price
            await new Promise(res => setTimeout(res, 50));
            return 68500.75;
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
        execute: async (args) => {
            const message = args['message'];
            const urgency = args['is_urgent'] ? 'URGENT' : 'Normal';
            console.log(`[Tool Call] report_analysis_result(message: "${message}", is_urgent: ${args['is_urgent'] ?? false})`);
            console.log(`\n--- FINAL REPORT (${urgency}) ---`);
            console.log(`${message}`);
            console.log(`--------------------------\n`);
            await new Promise(res => setTimeout(res, 20)); // Simulate action
            return true;
        }
    },
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

    // 1. Format Prompt
    const prompt = buildPrompt(toolRegistry, userTask);
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
    console.log("-------------------------\n");
}

async function main() {
    console.log("Starting NuwaScript Interactive Example...");
    console.log("Enter your task, or type 'exit'/'quit' to end.");

    // Setup Tool Registry (shared across interactions)
    const toolRegistry = new ToolRegistry();
    const toolLog: Array<{ toolName: string; args: Record<string, NuwaValue>}> = []; // Log can be shared too
    MOCK_TOOLS.forEach(tool => {
        toolRegistry.register(tool.schema.name, tool.schema, async (args) => {
            console.log(`[Tool Call Log] ${tool.schema.name}(${JSON.stringify(args)})`);
            toolLog.push({ toolName: tool.schema.name, args });
            return await tool.execute(args);
        });
    });
    console.log("Tool registry initialized.");

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
