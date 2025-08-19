// Client component for admin messages tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState, useCallback } from 'react';
import { AdminMessagesTemplate } from '@/components/templates/AdminMessagesTemplate';
import { ConversationWithUser, ChatMessage } from '@/types/messages';


type Props = {
  initialConversations: ConversationWithUser[];
};

export function AdminMessagesPageClient({ initialConversations }: Props) {
  const { start, end } = useDateRange();
  const [conversations, setConversations] = useState<ConversationWithUser[]>(initialConversations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch conversations when date range changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/messages/conversations?start=${encodeURIComponent(start || '')}&end=${encodeURIComponent(end || '')}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConversations(Array.isArray(data.conversations) ? data.conversations.filter(Boolean) : []);
        } else {
          setError(data.error || 'Failed to fetch conversations');
        }
      })
      .catch(() => setError('Failed to fetch conversations'))
      .finally(() => setLoading(false));
  }, [start, end]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await fetch('/api/admin/messages/conversation/' + conversationId);
    const data = await res.json();
    if (data.success) return data.messages || [];
    return [];
  }, []);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading messages...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;

  return (
    <AdminMessagesTemplate conversations={conversations} fetchMessages={fetchMessages} />
  );
}