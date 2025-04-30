import { type CoreMessage } from 'ai';
import { NextResponse } from 'next/server';
import { classifyMessage, generateAIResponseStream } from '../agent';
import { getServerSession } from 'next-auth';

// 拓展 NextAuth Session 类型
declare module "next-auth" {
    interface Session {
        user?: {
            name: string;
            twitterHandle: string;
            image?: string | null;
        }
    }
}

// 用户信息类型定义
interface UserInfo {
    name: string;
    twitterHandle: string;
    // Add other potential fields
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Add a new interface for message classification
export async function GET(req: Request) {
    const session = await getServerSession();
    
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get message content from request URL
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    
    const userInfo: UserInfo = {
        name: session.user.name,
        twitterHandle: session.user.twitterHandle
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

export async function POST(req: Request) {
    const session = await getServerSession();
    
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Explicitly type the destructured request body
    const { messages, classifiedMissionId }: {
        messages: CoreMessage[];
        classifiedMissionId: string | null;
    } = await req.json();

    const userInfo: UserInfo = {
        name: session.user.name || 'visitor',
        twitterHandle: session.user.twitterHandle || 'visitor'
    };

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }

    const result = await generateAIResponseStream(messages, userInfo, classifiedMissionId);

    return result.toDataStreamResponse();
}