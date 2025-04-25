import { openai } from '@ai-sdk/openai';
import {
    streamText,
    type CoreMessage,
    type StreamTextResult,
    // Import specific callback types:
    type StreamTextOnFinishCallback,
    type StreamTextOnErrorCallback,
    type StreamTextOnStepFinishCallback,
    type StreamTextOnChunkCallback,
    type TextStreamPart,
    type StepResult,
} from 'ai';
import { tools } from './tools';
import { classifyUserMission, getMissionSystemPrompt, getDefaultSystemPrompt } from './mission-router';
import { NextResponse } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Add a new interface for message classification
export async function GET(req: Request) {
    // Get message content from request URL
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    const userName = url.searchParams.get('userName') || 'visitor';
    const twitterHandle = url.searchParams.get('twitterHandle') || 'visitor';

    const userInfo = {
        name: userName,
        twitterHandle: twitterHandle
    };

    if (!message) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Classify the message
    const classification = await classifyUserMission(message, userInfo);
    console.log('classification:', JSON.stringify(classification, null, 2));

    // Return classification result
    return NextResponse.json({
        missionId: classification.missionId,
        confidence: classification.confidence,
        reasoning: classification.reasoning
    });
}

// Define a type for userInfo if possible, otherwise use Record<string, unknown>
interface UserInfo {
    name: string;
    twitterHandle: string;
    // Add other potential fields
}

export async function POST(req: Request) {
    // Explicitly type the destructured request body
    const { messages, userInfo, classifiedMissionId }: {
        messages: CoreMessage[];
        userInfo: UserInfo; // Use the defined interface
        classifiedMissionId: string | null;
    } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }

    let systemPrompt;

    if (classifiedMissionId) {
        systemPrompt = await getMissionSystemPrompt(classifiedMissionId, userInfo || {});
    } else {
        systemPrompt = await getDefaultSystemPrompt(userInfo || {});
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
        // ADD onChunk callback to observe tool events as they happen
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
                // Log other chunk types if needed
                // case 'text-delta':
                //     process.stdout.write(event.chunk.textDelta);
                //     break;
                // case 'reasoning':
                //     console.log('\n[AI Stream] Chunk: Reasoning Delta:', event.chunk.textDelta);
                //     break;
            }
        }) as StreamTextOnChunkCallback<typeof tools>,
    };

    const result: StreamTextResult<typeof tools, unknown> = await streamText(streamOptions);

    return result.toDataStreamResponse();
}