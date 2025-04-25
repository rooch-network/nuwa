import { openai } from '@ai-sdk/openai';
import {
    streamText,
    type CoreMessage,
    type ToolCall,
    type ToolResult,
    type StreamTextResult,
    // Import specific callback types:
    type StreamTextOnFinishCallback,
    type StreamTextOnErrorCallback,
    type StreamTextOnStepFinishCallback,
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
        onToolCall: (toolCall: ToolCall<string, unknown>) => {
            console.log(`[AI Stream] Calling tool: ${toolCall.toolName}`, toolCall.args);
        },
        onToolResult: (toolResult: ToolResult<string, unknown, unknown>) => {
            console.log(`[AI Stream] Tool result for ${toolResult.toolName}:`, toolResult.result);
        },
        onError: ((event: { error: unknown }) => {
            console.error('[AI Stream] Error:', event.error);
        }) as StreamTextOnErrorCallback,
        onStepFinish: ((stepResult: StepResult<typeof tools>) => {
            console.log('[AI Stream] Step Finished. Request sent to LLM:', JSON.stringify(stepResult.request, null, 2));
            // You might want to log other step details too:
            // console.log('[AI Stream] Step Response:', stepResult.response);
            // console.log('[AI Stream] Step Text:', stepResult.text);
        }) as StreamTextOnStepFinishCallback<typeof tools>,
    };

    // StreamTextResult requires TOOLS and PARTIAL_OUTPUT generics
    // Since we don't use experimental_output, PARTIAL_OUTPUT can be unknown or undefined
    const result: StreamTextResult<typeof tools, unknown> = await streamText(streamOptions);

    return result.toDataStreamResponse();
}