// Client component for admin messages tab
'use client';
import { useCallback } from 'react';
import { AdminMessagesTemplate } from '@/components/templates/AdminMessagesTemplate';
import { ChatMessage } from '@/types/messages';
import { AdminConversation } from '@/types/messages';
type Props = {
  initialConversations: AdminConversation[];
  initialMessages: Record<string, ChatMessage[]>;
};

export function AdminMessagesPageClient({
  initialConversations,
  initialMessages,
}: Props) {
  // Provide a fetchMessages function that reads from the pre-fetched messages
  const fetchMessages = useCallback(
    async (conversationId: string): Promise<ChatMessage[]> => {
      return initialMessages[conversationId] || [];
    },
    [initialMessages],
  );

  return (
    <AdminMessagesTemplate
      conversations={initialConversations}
      fetchMessages={fetchMessages}
    />
  );
}
