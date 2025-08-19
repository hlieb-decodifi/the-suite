
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesForAdmin } from '@/server/domains/messages/admin-messages';

export async function GET(_req: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await context.params;
  const result = await getMessagesForAdmin(conversationId);
  return NextResponse.json(result);
}
