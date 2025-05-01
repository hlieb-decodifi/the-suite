import { toggleProfilePublishStatusAction } from '@/server/actions/profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await request.json();
  const result = await toggleProfilePublishStatusAction(userId, body);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
} 