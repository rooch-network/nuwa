import { NextResponse } from 'next/server';
import { getUserPointsHistory } from '@/app/services/supabaseService';
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
    const history = await getUserPointsHistory(session.user.twitterHandle);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching user points history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user points history' }, 
      { status: 500 }
    );
  }
}
