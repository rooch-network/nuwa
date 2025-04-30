import { type CoreMessage } from 'ai';
import { NextResponse } from 'next/server';
import { classifyMessage, generateAIResponseStream } from '../agent';

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

    const classification = await classifyMessage(message, userInfo);
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

    const result = await generateAIResponseStream(messages, userInfo, classifiedMissionId);

    return result.toDataStreamResponse();
}