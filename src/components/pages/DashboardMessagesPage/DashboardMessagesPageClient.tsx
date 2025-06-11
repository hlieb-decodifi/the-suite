'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircleIcon, SendIcon, PlusIcon } from 'lucide-react';
// import { createClient } from '@/lib/supabase/client'; // Removed since we're using polling instead of realtime
import { ConversationWithUser, ChatMessage } from '@/types/messages';
import { sendMessage, getMessages, markMessagesAsRead, createOrGetConversation } from '@/server/domains/messages/actions';

type DashboardMessagesPageClientProps = {
  isProfessional: boolean;
  initialConversations: ConversationWithUser[];
  availableProfessionals: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profession?: string | undefined;
    profile_photo_url?: string | undefined;
  }>;
  currentUserId: string;
};

export function DashboardMessagesPageClient({
  isProfessional,
  initialConversations,
  availableProfessionals,
  currentUserId,
}: DashboardMessagesPageClientProps) {
  const [conversations, setConversations] = useState<ConversationWithUser[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  // const supabase = createClient(); // Removed since we're using polling instead of realtime

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Polling for new messages (fallback for realtime issues)
  useEffect(() => {
    if (!selectedConversation) return;

    const pollForMessages = async () => {
      const result = await getMessages(selectedConversation.id);
      if (result.success && result.messages) {
        const newMessages = result.messages;
        setMessages(prev => {
          // Only update if there are actually new messages
          if (newMessages.length !== prev.length) {
            return newMessages;
          }
          return prev;
        });
      }
    };

    // Poll every 3 seconds for new messages
    const interval = setInterval(pollForMessages, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedConversation]);

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    const result = await getMessages(conversationId);
    if (result.success) {
      setMessages(result.messages || []);
    } else {
      console.error('Failed to load messages:', result.error);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setIsLoading(true);
    const result = await sendMessage(selectedConversation.id, newMessage);
    
    if (result.success) {
      setNewMessage('');
      // Immediately refresh messages to show the new message
      const messagesResult = await getMessages(selectedConversation.id);
      if (messagesResult.success && messagesResult.messages) {
        setMessages(messagesResult.messages);
        
        // Update the conversation list with the new message
        if (result.message) {
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedConversation.id
                ? { ...conv, last_message: result.message!, updated_at: result.message!.created_at }
                : conv
            )
          );
        }
      }
    } else {
      console.error('Failed to send message:', result.error);
    }
    setIsLoading(false);
  };

  const handleStartConversation = async (professionalId: string) => {
    setIsLoading(true);
    const result = await createOrGetConversation(professionalId);
    
    if (result.success && result.conversation) {
      // Find the professional in the available list to create a conversation object
      const professional = availableProfessionals.find(p => p.id === professionalId);
      if (professional) {
        const otherUser: ConversationWithUser['other_user'] = {
          id: professional.id,
          first_name: professional.first_name,
          last_name: professional.last_name,
        };
        
        if (professional.profile_photo_url) {
          otherUser.profile_photo_url = professional.profile_photo_url;
        }
        
        const newConversation: ConversationWithUser = {
          ...result.conversation,
          other_user: otherUser,
          unread_count: 0,
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
        setShowNewConversation(false);
      }
    } else {
      console.error('Failed to start conversation:', result.error);
    }
    setIsLoading(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (conversations.length === 0 && !isProfessional && availableProfessionals.length === 0) {
    return (
      <div className="space-y-6">
        <Typography variant="h3" className="font-semibold">
          Messages
        </Typography>
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <MessageCircleIcon className="h-12 w-12 text-primary" />
            </div>
            <Typography variant="h3" className="font-semibold mb-2">
              No Messages Available
            </Typography>
            <Typography className="text-muted-foreground max-w-md">
              There are no professionals available for messaging at this time.
            </Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Typography variant="h3" className="font-semibold">
          Messages
        </Typography>
        {!isProfessional && availableProfessionals.length > 0 && (
          <Button
            onClick={() => setShowNewConversation(!showNewConversation)}
            size="sm"
            className="gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Message
          </Button>
        )}
      </div>

      {showNewConversation && (
        <Card>
          <CardHeader>
            <Typography variant="h4">Start New Conversation</Typography>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableProfessionals.map((professional) => (
              <div
                key={professional.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleStartConversation(professional.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={professional.profile_photo_url} />
                    <AvatarFallback>
                      {getInitials(professional.first_name, professional.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Typography className="font-medium">
                      {professional.first_name} {professional.last_name}
                    </Typography>
                    {professional.profession && (
                      <Typography variant="small" className="text-muted-foreground">
                        {professional.profession}
                      </Typography>
                    )}
                  </div>
                </div>
                <Button size="sm" disabled={isLoading}>
                  Message
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <Typography variant="h4">Conversations</Typography>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <Typography className="text-muted-foreground">
                    No conversations yet
                  </Typography>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b cursor-pointer hover:bg-accent ${
                      selectedConversation?.id === conversation.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={conversation.other_user.profile_photo_url} />
                        <AvatarFallback>
                          {getInitials(
                            conversation.other_user.first_name,
                            conversation.other_user.last_name
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Typography className="font-medium truncate">
                            {conversation.other_user.first_name} {conversation.other_user.last_name}
                          </Typography>
                          {conversation.unread_count > 0 && (
                            <Badge variant="default" className="text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.last_message && (
                          <div className="flex items-center justify-between">
                            <Typography variant="small" className="text-muted-foreground truncate">
                              {conversation.last_message.content}
                            </Typography>
                            <Typography variant="small" className="text-muted-foreground">
                              {formatTime(conversation.last_message.created_at)}
                            </Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.other_user.profile_photo_url} />
                    <AvatarFallback>
                      {getInitials(
                        selectedConversation.other_user.first_name,
                        selectedConversation.other_user.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <Typography variant="h4">
                    {selectedConversation.other_user.first_name} {selectedConversation.other_user.last_name}
                  </Typography>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[500px]">
                <div className="flex-1 p-4 overflow-y-auto">
                  {isLoading && messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Typography className="text-muted-foreground">Loading messages...</Typography>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Typography className="text-muted-foreground">
                        No messages yet. Start the conversation!
                      </Typography>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === currentUserId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-accent'
                            }`}
                          >
                            <Typography variant="small">{message.content}</Typography>
                            <Typography
                              variant="small"
                              className={`text-xs mt-1 ${
                                message.sender_id === currentUserId
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </Typography>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t p-4 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !newMessage.trim()}
                    size="icon"
                  >
                    <SendIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center text-center h-full py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <MessageCircleIcon className="h-12 w-12 text-primary" />
              </div>
              <Typography variant="h4" className="font-semibold mb-2">
                Select a Conversation
              </Typography>
              <Typography className="text-muted-foreground">
                Choose a conversation from the list to start messaging.
              </Typography>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
