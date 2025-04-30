import { NextResponse } from 'next/server';
import { getUserPointsByHandle } from '@/app/services/supabaseService';
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession();
  
  if (!session || !session.user || !session.user.twitterHandle) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  try {
    const points = await getUserPointsByHandle(session.user.twitterHandle);
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user points', points: 0 }, 
      { status: 500 }
    );
  }
}
