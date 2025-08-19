import { useState } from 'react';
import { ConversationWithUser } from '@/types/messages';

export function useAdminMessages(conversations: ConversationWithUser[] = []) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;
  return {
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
  };
}
