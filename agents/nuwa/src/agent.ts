import { Interpreter, OutputHandler, ToolRegistry } from "nuwa-script";
import { AIService, AIResponse } from './aiService.js';
import OpenAI from 'openai';

// --- Locally Defined Types --- 

// Define Participant based on usage in Agent constructor
interface Participant {
    id: string; // Added id based on server.ts usage
    name: string;
    // Add other fields if needed by Agent
}

// Define AgentMessage based on usage in handleMessage and server.ts
interface AgentMessage {
    text: string;
    history: { // Structure based on server.ts mapping
        role: string;
        content: string | null;
    }[];
}

// Define AgentResponse based on usage in handleMessage return type
interface AgentResponse {
    response: {
        from: string;
        text: string;
        // history?: any[]; // Optional: if history needs to be passed back
    };
    // stream?: any; // Add if streaming is implemented
}

// Optional: Define AgentStreamEvent if streaming is needed later
// interface AgentStreamEvent { ... }

// --- End Locally Defined Types ---

// Define a simple type for history messages used in the map
interface HistoryMessage {
    role: string;
    content: string | null;
    // Add other potential fields if needed from AgentMessage history structure
}

// Implement OutputHandler to buffer PRINT statements
class AgentOutputHandler implements OutputHandler {
    private buffer: string[] = [];

    handlePrint(value: any): void {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        this.buffer.push(`PRINT: ${stringValue}`);
    }

    getBufferedOutput(): string {
        return this.buffer.join('\n');
    }

    clearBuffer(): void {
        this.buffer = [];
    }
}

export class Agent {
    private interpreter: Interpreter;
    private aiService: AIService;
    private outputHandler: AgentOutputHandler;
    private toolRegistry: ToolRegistry; // Store ToolRegistry instance

    constructor(private participant: Participant) {
        this.toolRegistry = new ToolRegistry(); // Initialize ToolRegistry
        this.interpreter = new Interpreter(this.toolRegistry); // Pass registry to Interpreter
        this.outputHandler = new AgentOutputHandler();
        this.interpreter.registerOutputHandler(this.outputHandler);
        
        // TODO: Register actual tools into this.toolRegistry based on participant or config
        // Example registration (replace with actual tools):
        // this.toolRegistry.register(calculatorSchema, calculatorExecutor);

        // Initialize AIService (ensure required env vars like OPENAI_API_KEY are set)
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
             console.error("FATAL: OPENAI_API_KEY environment variable is not set.");
             // Decide how to handle this - throw error, exit, or run in a limited mode?
             // For now, let's throw an error to make it clear.
             throw new Error("OPENAI_API_KEY environment variable is not set.");
        }
        this.aiService = new AIService({
            apiKey: apiKey,
            baseUrl: process.env.OPENAI_API_BASE, // Optional: read from env
            model: process.env.OPENAI_MODEL, // Optional: read from env
            // You could also add a base system prompt here if desired
        });
    }

    async handleMessage(message: AgentMessage): Promise<AgentResponse> {
        console.log(`[Agent] Handling message:`, message.text);
        this.outputHandler.clearBuffer();

        // Use reduce for more controlled type handling during history mapping
        const history = message.history.reduce((acc: OpenAI.Chat.Completions.ChatCompletionMessageParam[], msg: HistoryMessage) => {
            if (msg.role === 'user') {
                // Ensure content is string for user role
                acc.push({ role: 'user', content: msg.content ?? "" });
            } else if (msg.role === 'assistant') {
                // Assistant content can be null
                acc.push({ role: 'assistant', content: msg.content }); 
            } else if (msg.role === 'system') {
                 // Ensure content is string for system role
                acc.push({ role: 'system', content: msg.content ?? "" });
            }
            // Ignore other roles like 'tool'
            return acc;
        }, [] as OpenAI.Chat.Completions.ChatCompletionMessageParam[]); // Initialize with typed empty array

        // Add the current user message
        const currentUserMessage: OpenAI.Chat.Completions.ChatCompletionUserMessageParam = {
            role: 'user',
            content: message.text
        };
        history.push(currentUserMessage);

        try {
            // Call AIService - it now expects history including the latest message
            const aiResponse: AIResponse = await this.aiService.generateOrGetResponse(
                history,
                this.toolRegistry // Pass the registry for prompt generation
            );

            let scriptToExecute: string | null = null;
            let finalContent = "";

            // Check the type of response from AIService
            if (aiResponse.type === 'script') {
                scriptToExecute = aiResponse.script;
                console.log("[Agent] Received script from AIService.");
                // Optional: Add the assistant's raw response (the script block) to history? 
                // history.push({ role: 'assistant', content: `\`\`\`nuwa\n${scriptToExecute}\n\`\`\`` });
            } else { // aiResponse.type === 'text'
                finalContent = aiResponse.content;
                console.log("[Agent] Received text response from AIService.");
                // Add the assistant's text response to history
                // history.push({ role: 'assistant', content: finalContent });
            }

            // --- Script Execution (if script was received) ---
            if (scriptToExecute) {
                console.log(`[Agent] Executing script:\n--- Script Start ---\n${scriptToExecute}\n--- Script End ---`);
                try {
                    // Use interpreter.execute (or execute if you parse AST elsewhere)
                    const exec_scope = await this.interpreter.execute(scriptToExecute);
                    console.log("[Agent] Script execution successful. Scope:", exec_scope);
                    const bufferedOutput = this.outputHandler.getBufferedOutput();
                    
                    finalContent = bufferedOutput || "(Script executed successfully, no output)";
                    console.log("[Agent] Script execution successful.");
                    
                    // TODO: Decide how to represent script execution in history. 
                    // Maybe add a 'tool' role message with the script result?
                    // history.push({ 
                    //     role: 'tool', // Or a custom role?
                    //     content: finalContent, // The result of the execution
                    //     // We don't have a tool_call_id anymore
                    // });

                } catch (execError: any) {
                    console.error("[Agent] Script execution error:", execError);
                    const bufferedOutput = this.outputHandler.getBufferedOutput();
                    finalContent = bufferedOutput ? `Partial Output:\n${bufferedOutput}\n\n` : ''; // Show partial output first
                    finalContent += `Error executing script: ${execError.message || execError}`;
                    // TODO: Add tool execution error to history?
                }
            }
            // --- End Script Execution ---
            
            // Ensure history doesn't grow indefinitely (implement strategy if needed)

            console.log("[Agent] Sending final response:", finalContent);
            return {
                response: {
                    from: this.participant.name,
                    text: finalContent,
                    // Pass potentially updated history back if A2A requires it
                    // history: history 
                }
            };
        } catch (error) {
            console.error("[Agent] Error in handleMessage:", error);
            return {
                response: {
                    from: this.participant.name,
                    text: "An error occurred while processing your request."
                }
            };
        }
    }
}