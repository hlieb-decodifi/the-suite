import { NextRequest, NextResponse } from 'next/server';
import { getAllGeneralConversationsForAdmin } from '@/server/domains/messages/admin-actions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const result = await getAllGeneralConversationsForAdmin({ start, end });
  return NextResponse.json(result);
}
