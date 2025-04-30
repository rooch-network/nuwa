import { openai } from '@ai-sdk/openai';
import {
    streamText,
    type CoreMessage,
    type StreamTextResult,
    type StreamTextOnFinishCallback,
    type StreamTextOnErrorCallback,
    type StreamTextOnStepFinishCallback,
    type StreamTextOnChunkCallback,
    type TextStreamPart,
    type StepResult,
} from 'ai';
import { tools } from '../chat/tools';
import { classifyUserMission, getMissionSystemPrompt, getDefaultSystemPrompt, UserInfo } from '../chat/mission-router';

/**
 * Classify user message using AI
 */
export async function classifyMessage(
    message: string,
    userInfo: UserInfo
) {
    return await classifyUserMission(message, userInfo);
}

/**
 * Generate AI response stream
 */
export async function generateAIResponseStream(
    messages: CoreMessage[],
    userInfo: UserInfo,
    classifiedMissionId: string | null
): Promise<StreamTextResult<typeof tools, unknown>> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }

    let systemPrompt;

    if (classifiedMissionId) {
        systemPrompt = await getMissionSystemPrompt(classifiedMissionId, userInfo);
    } else {
        systemPrompt = await getDefaultSystemPrompt(userInfo);
    }

    // Define streamText options with inline callbacks and exact types
    const streamOptions = {
        model: openai('gpt-4o-mini'),
        messages,
        tools,
        system: systemPrompt,
        maxSteps: 50,
        toolChoice: 'auto' as const,
        onStart: () => {
            //console.log('[AI Stream] Started.');
        },
        onFinish: ((event: Omit<StepResult<typeof tools>, 'stepType' | 'isContinued'> & { readonly steps: StepResult<typeof tools>[]; }) => {
            console.log('[AI Stream] Completed. Finish Reason:', event.finishReason, event.usage, event.steps);
        }) as StreamTextOnFinishCallback<typeof tools>,
        onError: ((event: { error: unknown }) => {
            console.error('[AI Stream] Error:', event.error);
        }) as StreamTextOnErrorCallback,
        onStepFinish: ((stepResult: StepResult<typeof tools>) => {
            console.log('[AI Stream] Step Finished. Request sent to LLM:', JSON.stringify(stepResult.request, null, 2));
            // Log tool calls and results at the end of the step if needed
            if (stepResult.toolCalls.length > 0) {
                console.log('[AI Stream] Step Tool Calls:', JSON.stringify(stepResult.toolCalls, null, 2));
            }
            if (stepResult.toolResults.length > 0) {
                console.log('[AI Stream] Step Tool Results:', JSON.stringify(stepResult.toolResults, null, 2));
            }
        }) as StreamTextOnStepFinishCallback<typeof tools>,
        onChunk: ((event: { chunk: TextStreamPart<typeof tools> }) => {
            switch (event.chunk.type) {
                case 'tool-call':
                    console.log('[AI Stream] Chunk: Tool Call:', JSON.stringify(event.chunk, null, 2));
                    break;
                case 'tool-call-streaming-start':
                    console.log('[AI Stream] Chunk: Tool Call Streaming Start:', JSON.stringify(event.chunk, null, 2));
                    break;
                case 'tool-call-delta':
                    // This might be too verbose, log selectively if needed
                    // console.log('[AI Stream] Chunk: Tool Call Delta:', JSON.stringify(event.chunk, null, 2));
                    break;
                case 'tool-result':
                    console.log('[AI Stream] Chunk: Tool Result:', JSON.stringify(event.chunk, null, 2));
                    break;
            }
        }) as StreamTextOnChunkCallback<typeof tools>,
    };

    return await streamText(streamOptions);
}

/**
 * Generate AI response text (non-streaming)
 */
export async function generateAIResponse(
    messages: CoreMessage[],
    userInfo: UserInfo,
    classifiedMissionId: string | null
): Promise<string> {
    const stream = await generateAIResponseStream(messages, userInfo, classifiedMissionId);
    let fullText = '';
    
    // Use stream.textStream iterator to collect text
    for await (const chunk of stream.textStream) {
        fullText += chunk;
    }
    
    return fullText;
} 