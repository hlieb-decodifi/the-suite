
import { AdminMessagesPageClient } from './AdminMessagesPageClient';
import { getAllGeneralConversationsForAdmin } from '@/server/domains/messages/admin-actions';
import { getMessagesForAdmin } from '@/server/domains/messages/admin-messages';
import { AdminConversation, ChatMessage } from '@/types/messages';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

// Server component: fetch conversations and pass as props
type AdminMessagesPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function AdminMessagesPage({ searchParams }: AdminMessagesPageProps = {}) {
  const start = typeof searchParams?.start === 'string' ? searchParams.start : '';
  const end = typeof searchParams?.end === 'string' ? searchParams.end : '';
  let conversations: AdminConversation[] = [];
  let allMessages: Record<string, ChatMessage[]> = {};
  try {
    const result = await getAllGeneralConversationsForAdmin({ start, end });
    if (result && result.success && 'conversations' in result && Array.isArray(result.conversations)) {
  conversations = result.conversations.filter(Boolean) as AdminConversation[];
      // Fetch all messages for all conversations
      const messagesResults = await Promise.all(
        conversations.map(async (conv) => {
          const res = await getMessagesForAdmin(conv.id);
          return { id: conv.id, messages: res.success && Array.isArray(res.messages) ? res.messages : [] };
        })
      );
      allMessages = Object.fromEntries(messagesResults.map(r => [r.id, r.messages]));
    } else {
      conversations = [];
      allMessages = {};
    }
  } catch {
    notFound();
  }
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading messages...</div>}>
      <AdminMessagesPageClient initialConversations={conversations} initialMessages={allMessages} />
    </Suspense>
  );
}