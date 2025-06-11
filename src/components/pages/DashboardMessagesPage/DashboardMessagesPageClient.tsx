'use client';

import { useState, useEffect, useRef } from 'react';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Replaced with textarea
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Badge } from '@/components/ui/badge'; // Removed as we're using custom unread count styling
import { MessageCircleIcon, SendIcon, PlusIcon } from 'lucide-react';
// import { createClient } from '@/lib/supabase/client'; // Removed since we're using polling instead of realtime
import { ConversationWithUser, ChatMessage } from '@/types/messages';
import { sendMessage, getMessages, markMessagesAsRead, createOrGetConversation } from '@/server/domains/messages/actions';
import { cn } from '@/utils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const supabase = createClient(); // Removed since we're using polling instead of realtime

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to first unread message or bottom if no unread messages
  const scrollToFirstUnreadOrBottom = (messages: ChatMessage[]) => {
    const firstUnreadMessage = messages.find(msg => !msg.is_read && msg.sender_id !== currentUserId);
    if (firstUnreadMessage) {
      // Scroll to first unread message
      const messageElement = document.getElementById(`message-${firstUnreadMessage.id}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback to bottom if element not found
        setTimeout(() => scrollToBottom(), 100);
      }
    } else {
      // No unread messages, scroll to bottom
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  // Load messages for selected conversation and mark as read
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
      
      // Update the conversation's unread count to 0 when selected
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    }
  }, [selectedConversation]);

  // Enhanced polling for conversations with tab visibility and longer intervals
  useEffect(() => {
    let conversationInterval: ReturnType<typeof setInterval>;
    let isTabVisible = true;

    // Check if tab is visible to avoid polling when user is away
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        // Immediately check for updates when user comes back
        pollForConversations();
      }
    };

    const pollForConversations = async () => {
      // Only poll if tab is visible
      if (!isTabVisible) return;
      
      try {
        const { getConversations } = await import('@/server/domains/messages/actions');
        const result = await getConversations();
        if (result.success && result.conversations) {
          setConversations(result.conversations);
        }
      } catch (error) {
        console.error('Failed to poll conversations:', error);
      }
    };

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 30 seconds instead of 5 seconds (6x less frequent)
    const startPolling = () => {
      conversationInterval = setInterval(() => {
        if (isTabVisible) {
          pollForConversations();
        }
      }, 30000);
    };
    
    startPolling();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(conversationInterval);
    };
  }, []);

  // Enhanced polling for messages with user interaction awareness
  useEffect(() => {
    if (!selectedConversation) return;

    let messageInterval: ReturnType<typeof setTimeout>;
    let isTabVisible = true;
    let lastInteractionTime = Date.now();

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastInteractionTime = Date.now();
        // Only poll when user returns to tab
        pollForMessages();
      }
    };

    const handleUserInteraction = () => {
      lastInteractionTime = Date.now();
    };

    const pollForMessages = async () => {
      // Only poll if tab is visible
      if (!isTabVisible) return;
      
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

    // Add event listeners for user interaction
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    // Very conservative polling: only poll every 5 minutes if user is completely inactive
    const conservativePolling = () => {
      if (!isTabVisible) return;
      
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      
      // Only poll if user has been inactive for more than 5 minutes
      if (timeSinceInteraction > 300000) {
        pollForMessages();
      }
      
      // Check again in 5 minutes
      messageInterval = setTimeout(conservativePolling, 300000);
    };

    // Start conservative polling (every 5 minutes for inactive users only)
    messageInterval = setTimeout(conservativePolling, 300000);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      clearTimeout(messageInterval);
    };
  }, [selectedConversation]);

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    const result = await getMessages(conversationId);
    if (result.success) {
      const loadedMessages = result.messages || [];
      setMessages(loadedMessages);
      // Scroll to first unread or bottom after messages are loaded
      setTimeout(() => scrollToFirstUnreadOrBottom(loadedMessages), 100);
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
        
        // Immediately update the conversation list with the new message and move to top
        if (result.message) {
          setConversations(prev => {
            const updatedConversations = prev.map(conv =>
              conv.id === selectedConversation.id
                ? { 
                    ...conv, 
                    last_message: result.message!, 
                    updated_at: result.message!.created_at,
                    unread_count: 0 // Reset unread count since user is viewing
                  }
                : conv
            );
            
            // Move the updated conversation to the top
            const targetConv = updatedConversations.find(conv => conv.id === selectedConversation.id);
            const otherConvs = updatedConversations.filter(conv => conv.id !== selectedConversation.id);
            
            return targetConv ? [targetConv, ...otherConvs] : updatedConversations;
          });
          
          // Update selected conversation with new message
          setSelectedConversation(prev => prev ? {
            ...prev,
            last_message: result.message!,
            updated_at: result.message!.created_at,
            unread_count: 0
          } : null);
        }
        
        // Scroll to bottom after sending message
        setTimeout(() => scrollToBottom(), 100);
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
        
        setConversations(prev => {
          // Remove any existing conversation with the same ID, then add the new one at the top
          const filtered = prev.filter(conv => conv.id !== newConversation.id);
          return [newConversation, ...filtered];
        });
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
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
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <MessageCircleIcon className="h-12 w-12 text-primary" />
            </div>
            <Typography variant="h3" className="font-semibold mb-2">
              No Messages Available
            </Typography>
            <Typography className="text-muted-foreground max-w-md">
              There are no professionals available for messaging at this time.
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <Typography variant="h3" className="font-semibold text-xl lg:text-2xl">
          Messages
        </Typography>
        {!isProfessional && availableProfessionals.length > 0 && (
          <Button
            onClick={() => setShowNewConversation(!showNewConversation)}
            variant="outline"
            className="font-medium justify-start text-foreground border-border w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Message
          </Button>
        )}
      </div>

      {showNewConversation && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <Typography variant="h4">Start New Conversation</Typography>
          </div>
          <div className="p-6 space-y-3">
            {availableProfessionals
              .filter(professional => 
                // Only show professionals who don't already have a conversation
                !conversations.some(conv => conv.other_user.id === professional.id)
              )
              .map((professional) => (
                <div
                  key={professional.id}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                  onClick={() => handleStartConversation(professional.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={professional.profile_photo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(professional.first_name, professional.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Typography className="font-semibold">
                        {professional.first_name} {professional.last_name}
                      </Typography>
                      {professional.profession && (
                        <Typography variant="small" className="text-muted-foreground">
                          {professional.profession}
                        </Typography>
                      )}
                    </div>
                  </div>
                  <Button size="sm" disabled={isLoading} className="rounded-full px-6">
                    Message
                  </Button>
                </div>
              ))}
            {availableProfessionals.filter(professional => 
              !conversations.some(conv => conv.other_user.id === professional.id)
            ).length === 0 && (
              <div className="text-center py-8">
                <Typography className="text-muted-foreground">
                  You already have conversations with all available professionals.
                </Typography>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-200px)] lg:h-auto max-h-[600px]">
        {/* Conversations List */}
        <div className={`lg:col-span-1 bg-white rounded-lg border shadow-sm ${
          selectedConversation ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-4 lg:p-6 border-b">
            <Typography variant="h4" className="font-semibold text-lg lg:text-xl">Conversations</Typography>
          </div>
          <div className="p-0">
            <div className="h-[400px] lg:h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <Typography className="text-muted-foreground">
                    No conversations yet
                  </Typography>
                </div>
              ) : (
                conversations.map((conversation) => {
                  // Calculate unread count for display (should be 0 if this conversation is selected)
                  const displayUnreadCount = selectedConversation?.id === conversation.id ? 0 : conversation.unread_count;
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 lg:p-4 cursor-pointer transition-all duration-200 border-l-4 ${
                        selectedConversation?.id === conversation.id 
                          ? 'bg-muted/30 border-l-primary' 
                          : 'border-l-transparent hover:bg-muted/20 hover:border-l-muted'
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                            <AvatarImage src={conversation.other_user.profile_photo_url} />
                            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                              {getInitials(
                                conversation.other_user.first_name,
                                conversation.other_user.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {displayUnreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">
                                {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex-1 min-w-0 mr-2">
                              <Typography className="font-medium truncate text-sm" title={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}>
                                {conversation.other_user.first_name} {conversation.other_user.last_name}
                              </Typography>
                            </div>
                            {conversation.last_message && (
                              <Typography variant="small" className="text-muted-foreground text-xs flex-shrink-0">
                                {formatTime(conversation.last_message.created_at)}
                              </Typography>
                            )}
                          </div>
                          <div className="min-w-0">
                            {conversation.last_message && (
                              <Typography 
                                variant="small" 
                                className={`truncate text-xs block ${
                                  displayUnreadCount > 0 
                                    ? 'text-foreground font-medium' 
                                    : 'text-muted-foreground'
                                }`}
                                title={conversation.last_message.content}
                              >
                                {conversation.last_message.content}
                              </Typography>
                            )}
                            {!conversation.last_message && (
                              <Typography variant="small" className="text-muted-foreground italic text-xs">
                                No messages yet
                              </Typography>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Messages View */}
        <div className={`lg:col-span-2 bg-white rounded-lg border shadow-sm ${
          selectedConversation ? 'block' : 'hidden lg:block'
        }`}>
          {selectedConversation ? (
            <>
              <div className="p-4 lg:p-6 border-b">
                <div className="flex items-center gap-3 lg:gap-4">
                  {/* Back button for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  
                  <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                    <AvatarImage src={selectedConversation.other_user.profile_photo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                      {getInitials(
                        selectedConversation.other_user.first_name,
                        selectedConversation.other_user.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Typography variant="h4" className="font-semibold text-base lg:text-xl truncate">
                      {selectedConversation.other_user.first_name} {selectedConversation.other_user.last_name}
                    </Typography>
                    <Typography variant="small" className="text-muted-foreground text-xs lg:text-sm">
                      {isProfessional ? 'Client' : 'Professional'}
                    </Typography>
                  </div>
                </div>
              </div>
              <div className="flex flex-col h-[400px] lg:h-[500px]">
                <div className="flex-1 p-3 lg:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
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
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          id={`message-${message.id}`}
                          className={`flex items-end gap-2 ${
                            message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.sender_id !== currentUserId && (
                            <Avatar className="h-5 w-5 lg:h-6 lg:w-6 mb-1 hidden sm:block">
                              <AvatarImage src={selectedConversation.other_user.profile_photo_url} />
                              <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                                {getInitials(
                                  selectedConversation.other_user.first_name,
                                  selectedConversation.other_user.last_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              message.sender_id === currentUserId
                                ? 'bg-primary'
                                : 'bg-muted/30'
                            }`}
                          >
                            <Typography variant="small" className={cn(
                              "leading-relaxed text-sm break-words",
                              message.sender_id === currentUserId && "text-white"
                            )}>
                              {message.content}
                            </Typography>
                            <Typography
                              variant="small"
                              className={`text-xs mt-1 block ${
                                message.sender_id === currentUserId
                                  ? 'text-white/70 text-right'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                            </Typography>
                          </div>
                          {message.sender_id === currentUserId && (
                            <div className="h-5 w-5 lg:h-6 lg:w-6 mb-1 hidden sm:block" /> /* Spacer for alignment */
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="border-t p-3 lg:p-4">
                  <div className="flex gap-2 lg:gap-3 items-end">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isLoading}
                        maxLength={1000}
                        rows={1}
                        className="text-sm leading-tight w-full resize-none border border-border rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        style={{
                          minHeight: '40px',
                          maxHeight: '120px',
                          height: 'auto',
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !newMessage.trim()}
                      size="icon"
                      className="h-10 w-10 rounded-lg flex-shrink-0"
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-right">
                    <span 
                      className={
                        newMessage.length > 900 
                          ? 'text-destructive' 
                          : newMessage.length > 800 
                          ? 'text-orange-500' 
                          : 'text-muted-foreground'
                      }
                    >
                      {newMessage.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-16">
              <div className="rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 p-8 mb-6 shadow-lg">
                <MessageCircleIcon className="h-16 w-16 text-primary" />
              </div>
              <Typography variant="h4" className="font-semibold mb-3">
                Select a Conversation
              </Typography>
              <Typography className="text-muted-foreground max-w-sm">
                Choose a conversation from the list to start messaging, or create a new conversation with an available professional.
              </Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
