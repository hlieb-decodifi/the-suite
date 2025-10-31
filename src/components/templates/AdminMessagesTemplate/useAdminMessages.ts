import { useState } from 'react';
import { AdminConversation } from '@/types/messages';

export function useAdminMessages(conversations: AdminConversation[] = []) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const selectedConversation: AdminConversation | null =
    conversations.find((c) => c.id === selectedConversationId) || null;
  return {
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
  };
}
