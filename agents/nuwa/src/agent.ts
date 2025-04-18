import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Message as A2AMessage, TextPart } from './a2a-schema'; // Import A2A types for history
import {
    ChatCompletionMessageParam,
    ChatCompletionUserMessageParam,
    ChatCompletionAssistantMessageParam,
    ChatCompletionSystemMessageParam // Import system type as well
} from 'openai/resources/chat/completions'; // Import specific OpenAI message types

// Load environment variables from .env file
dotenv.config();

// --- OpenAI Client Initialization ---
let openaiClient: OpenAI | null = null;
let initError: Error | null = null;

try {
    const apiKey = process.env.OPENAI_API_KEY;
    const apiBase = process.env.OPENAI_API_BASE;
    console.log(`[Agent Init] Attempting to initialize OpenAI client.`);
    console.log(`[Agent Init] Found API Key: ${apiKey ? 'Yes' : 'No'}`);
    console.log(`[Agent Init] Found API Base from env: ${apiBase || 'Not set (will use default)'}`);

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set in the environment variables.');
    }

    // Directly define options for the constructor
    const options: { apiKey: string; baseURL?: string } = {
        apiKey: apiKey,
    };

    if (apiBase) {
        options.baseURL = apiBase;
        console.log(`[Agent Init] Using custom baseURL: ${apiBase}`);
    } else {
        console.log(`[Agent Init] Using default OpenAI baseURL.`);
    }

    openaiClient = new OpenAI(options); // Pass the options object directly
    console.log('[Agent Init] OpenAI client initialized successfully.');

} catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error('[Agent Init] Failed to initialize OpenAI client:', initError);
}

const defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
console.log(`[Agent Init] Using model: ${defaultModel}`);
// --- End OpenAI Initialization ---

// Define a type for the messages we actually create (User or Assistant with string content)
type SimpleChatCompletionMessageParam = 
    | { role: "user"; content: string; name?: string | undefined }
    | { role: "assistant"; content: string; name?: string | undefined; tool_calls?: any; function_call?: any; };

/**
 * Handles an incoming message using OpenAI and returns the agent's response.
 * Incorporates message history for contextual conversation.
 * @param currentMessageText The user's current message text.
 * @param history An array of previous A2A Message objects for this task.
 * @returns A promise resolving to the agent's response string.
 */
export async function handleMessage(currentMessageText: string, history: A2AMessage[] = []): Promise<string> {
    console.log(`[Agent] Received message: ${currentMessageText}`);
    console.log(`[Agent] Received history length: ${history.length}`);

    if (initError || !openaiClient) {
        console.error('[Agent] OpenAI client is not available.', initError);
        throw new Error(`OpenAI client is not initialized. ${initError?.message || 'Unknown initialization error.'}`);
    }

    // Convert A2A history messages to OpenAI format
    const openAIHistoryMessages: SimpleChatCompletionMessageParam[] = history.map(a2aMsg => {
        const textPart = a2aMsg.parts.find((part): part is TextPart => part.type === 'text') as TextPart | undefined;
        const content = textPart?.text || ''; // Ensure content is string
        if (a2aMsg.role === 'agent') {
            return { role: 'assistant' as const, content: content }; // Role 'assistant', content is string
        } else {
            return { role: 'user' as const, content: content }; // Role 'user', content is string
        }
    }).filter((msg): msg is SimpleChatCompletionMessageParam => !!msg.content); // Filter based on string content, type assertion

    // Construct the full message list for OpenAI, ensuring type compatibility
    const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' } as ChatCompletionSystemMessageParam,
        ...openAIHistoryMessages, // These are now SimpleChatCompletionMessageParam
        { role: 'user', content: currentMessageText } as ChatCompletionUserMessageParam // Current message
    ];

    console.log(`[Agent] Sending ${messages.length} messages to OpenAI model: ${defaultModel}.`);
    // If using custom base URL, it might be helpful to log this again
    if (process.env.OPENAI_API_BASE) {
        console.log(`[Agent] Target Base URL: ${process.env.OPENAI_API_BASE}`);
    }

    try {
        const completion = await openaiClient.chat.completions.create({
            model: defaultModel,
            messages: messages,
        });

        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
            console.error('[Agent] OpenAI response did not contain content:', completion);
            throw new Error('OpenAI response did not contain valid content.');
        }

        console.log(`[Agent] Received response from OpenAI.`); // Simplified success log
        return responseContent; // Assuming response content is string

    } catch (error) {
        console.error('[Agent] Error calling OpenAI API:');
        // Log the full error object for more details
        if (error instanceof Error) {
            console.error(`[Agent] Error Name: ${error.name}`);
            console.error(`[Agent] Error Message: ${error.message}`);
            if ('response' in error && error.response) { // Axios-like error structure
                console.error('[Agent] Error Response Status:', (error.response as any).status);
                console.error('[Agent] Error Response Data:', (error.response as any).data);
            } else if ('status' in error) { // Fetch-like error structure
                console.error('[Agent] Error Status:', (error as any).status);
            }
            console.error('[Agent] Error Stack:', error.stack);
        } else {
            console.error('[Agent] Non-Error object thrown:', error);
        }
        // Re-throw a more generic error for the server
        throw new Error(`Failed to get response from AI. Check agent logs for details.`);
    }
} 