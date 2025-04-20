import OpenAI from 'openai';
import { ToolRegistry, ToolSchema, JsonValue, buildPrompt } from 'nuwa-script'; // Import buildPrompt
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface AIServiceOptions {
    apiKey: string;
    model?: string;
    temperature?: number;
    baseUrl?: string;
    systemPrompt?: string; // Base system prompt (e.g., "You are a helpful assistant.")
}

export type AIResponse = 
    | { type: 'script'; script: string } 
    | { type: 'text'; content: string };

const DEFAULT_MODEL = 'gpt-3.5-turbo';
// Regex to find nuwa-script blocks
const SCRIPT_BLOCK_REGEX = /```nuwa\\n([\\s\\S]+?)\\n```/;

export class AIService {
    private openaiClient: OpenAI;
    private model: string;
    private temperature?: number;
    private baseSystemPrompt?: string; // Store the user-provided base system prompt

    constructor(options: AIServiceOptions) {
        if (!options.apiKey) {
            throw new Error('OpenAI API key is required for AIService.');
        }
        this.openaiClient = new OpenAI({
            apiKey: options.apiKey,
            baseURL: options.baseUrl || undefined,
        });
        this.model = options.model || DEFAULT_MODEL;
        this.temperature = options.temperature;
        this.baseSystemPrompt = options.systemPrompt; // Store the base prompt if provided
        console.log(`[AIService] Initialized with model: ${this.model}, temp: ${this.temperature}, baseURL: ${options.baseUrl || 'default'}`);
    }

    // Helper to extract script from text content
    private extractScript(content: string): string | null {
        const match = content.match(SCRIPT_BLOCK_REGEX);
        if (match && match[1]) {
            return match[1].trim();
        }
        return null;
    }

    /**
     * Gets response from LLM using nuwa-script's buildPrompt for tool/format instructions
     * within the system message, and sends full history.
     */
    async generateOrGetResponse(
        history: ChatCompletionMessageParam[], // Full history including the latest user message
        toolRegistry: ToolRegistry
    ): Promise<AIResponse> {
        
        // ASSUMPTION: User has modified nuwa-script's buildPrompt to handle null/undefined userPrompt
        // It should return only the tool descriptions and nuwa-script format instructions.
        const nuwaInstructionsPrompt = buildPrompt(
            toolRegistry, 
            null, // Pass null (or modify buildPrompt signature) - DO NOT pass user message here
            { appSpecificGuidance: "" } // Pass empty string or null for guidance within buildPrompt if baseSystemPrompt is handled separately
        );

        // Combine base system prompt (if any) with nuwa instructions
        let finalSystemContent = this.baseSystemPrompt ? `${this.baseSystemPrompt}\n\n${nuwaInstructionsPrompt}` : nuwaInstructionsPrompt;
        finalSystemContent = finalSystemContent.trim();

        console.log("[AIService] Final System Prompt Content:", finalSystemContent);

        // Prepare messages for OpenAI: System prompt + history (excluding any original system messages)
        const messagesForAPI: ChatCompletionMessageParam[] = [
            { role: 'system', content: finalSystemContent },
            // Append all messages from input history EXCEPT system messages
            ...history.filter(msg => msg.role !== 'system') 
        ];

        console.log(`[AIService] Calling OpenAI ${this.model} with ${messagesForAPI.length} messages.`);

        try {
            const completion = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: messagesForAPI,
                temperature: this.temperature,
                // No tools or tool_choice needed
            });

            const responseMessage = completion.choices[0]?.message;
            if (!responseMessage || !responseMessage.content) {
                 console.warn('[AIService] OpenAI response message is missing or has no content.');
                 return { type: 'text', content: "(Agent did not provide a response.)" };
            }

            const content = responseMessage.content;
            console.log(`[AIService] Received raw content:\n${content}`);

            // Check for nuwa-script block in the content
            const extractedScript = this.extractScript(content);

            if (extractedScript) {
                console.log(`[AIService] Extracted nuwa-script block.`);
                return { type: 'script', script: extractedScript };
            } else {
                // No script block found, return the full text content
                console.log(`[AIService] No script block found. Returning text response.`);
                return { type: 'text', content: content };
            }

        } catch (error) {
            console.error(`[AIService] Error calling OpenAI API:`, error);
            throw new Error(`AIService failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 