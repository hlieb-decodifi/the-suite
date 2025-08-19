// Helper to generate participant label using first_name and last_name
function getParticipantsLabel(conv: AdminConversation): string {

  const names = [];
  if (conv.client_user) {
    const first = conv.client_user.first_name?.trim();
    const last = conv.client_user.last_name?.trim();
    if (first || last) {
      names.push(`${first ?? ''} ${last ?? ''}`.trim());
    } else {
      names.push('Unknown Client');
    }
  }
  if (conv.professional_user) {
    const first = conv.professional_user.first_name?.trim();
    const last = conv.professional_user.last_name?.trim();
    if (first || last) {
      names.push(`${first ?? ''} ${last ?? ''}`.trim());
    } else {
      names.push('Unknown Professional');
    }
  }
  if (names.length === 0) {
    return 'Unknown Participants';
  }
  return names.join(', ');
}
import { Typography } from '@/components/ui/typography';
import { useAdminMessages } from './useAdminMessages';
import { ConversationWithUser, ChatMessage } from '@/types/messages';

type AdminConversation = ConversationWithUser & {
  client_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  professional_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};
import { useEffect, useState } from 'react';

type AdminMessagesTemplateProps = {
  conversations: AdminConversation[];
  fetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
};

export function AdminMessagesTemplate({ conversations, fetchMessages }: AdminMessagesTemplateProps) {
  const { selectedConversationId, setSelectedConversationId, selectedConversation } = useAdminMessages(conversations);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    fetchMessages(selectedConversationId)
      .then((msgs) => setMessages(msgs))
      .finally(() => setLoading(false));
  }, [selectedConversationId, fetchMessages]);

  return (
    <>
      <section className="flex flex-col md:flex-row gap-6 p-4">
        {/* Conversations list */}
        <div className="w-full md:w-1/3 border rounded bg-background">
          <Typography variant="h2" className="p-4 pb-2">Conversations</Typography>
          <div className="divide-y">
            {conversations.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">No conversations found.</div>
            )}
            {conversations.map((conv) => {
              const participantsLabel = getParticipantsLabel(conv);
              return (
                <button
                  key={conv.id}
                  className={`w-full text-left p-4 hover:bg-muted/30 ${selectedConversationId === conv.id ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedConversationId(conv.id)}
                  disabled={!conv.last_message}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{participantsLabel}</span>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground">{new Date(conv.last_message.created_at).toLocaleString()}</span>
                    )}
                  </div>
                  {conv.last_message && (
                    <div className="text-sm text-muted-foreground line-clamp-1">{conv.last_message.content}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages view */}
        <div className="flex-1 border rounded bg-background min-h-[400px] flex flex-col">
          <Typography variant="h2" className="p-4 pb-2">Messages</Typography>
          {!selectedConversation && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation to view messages.</div>
          )}
          {selectedConversation && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">No messages in this conversation.</div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const clientUser = (selectedConversation as AdminConversation).client_user;
                    const professionalUser = (selectedConversation as AdminConversation).professional_user;
                    let senderName = 'Unknown';
                    let senderRole = '';
                    if (msg.sender_id === selectedConversation?.client_id && (clientUser?.first_name || clientUser?.last_name)) {
                      senderName = `${clientUser?.first_name ?? ''} ${clientUser?.last_name ?? ''}`.trim();
                      senderRole = 'Client';
                    } else if (msg.sender_id === selectedConversation?.professional_id && (professionalUser?.first_name || professionalUser?.last_name)) {
                      senderName = `${professionalUser?.first_name ?? ''} ${professionalUser?.last_name ?? ''}`.trim();
                      senderRole = 'Professional';
                    }
                    return (
                      <div key={msg.id} className="p-3 rounded border bg-muted/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{senderName} {senderRole && `(${senderRole})`}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}