'use client';

import heic2any from 'heic2any';
import NextImage from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Typography } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  createOrGetConversationEnhanced,
  getMessages,
  markMessagesAsRead,
  sendMessage,
} from '@/server/domains/messages/actions';
import { ChatMessage, ConversationWithUser } from '@/types/messages';
import { cn } from '@/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ImageIcon, MessageCircleIcon, SendIcon, XIcon } from 'lucide-react';

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

// Image compression utility
const compressImage = async (file: File, quality = 0.8): Promise<File> => {
  try {
    let processedFile = file;

    // Convert HEIC/HEIF files to JPEG first
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      const convertedBlob = (await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      })) as Blob;

      processedFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg', lastModified: Date.now() },
      );
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        let { width, height } = img;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.(heic|heif|jpe?g|png|gif)$/i, '.webp'),
                {
                  type: 'image/webp',
                  lastModified: Date.now(),
                },
              );
              resolve(compressedFile);
            } else {
              resolve(processedFile);
            }
          },
          'image/webp',
          quality,
        );
      };

      img.onerror = () => {
        // If image fails to load, just return the processed file
        console.log('Failed to compress image, using processed file');
        resolve(processedFile);
      };

      img.src = URL.createObjectURL(processedFile);
    });
  } catch (error) {
    console.log('Error processing image:', error);
    return file;
  }
};

export function DashboardMessagesPageClient({
  isProfessional,
  initialConversations,
  availableProfessionals,
  currentUserId,
}: DashboardMessagesPageClientProps) {
  const [conversations, setConversations] =
    useState<ConversationWithUser[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedImages, setSelectedImages] = useState<
    Array<{ file: File; preview: string }>
  >([]);
  const [expandedMessageImages, setExpandedMessageImages] = useState<
    Set<string>
  >(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();

  // Handle conversation selection from URL parameters
  useEffect(() => {
    if (!searchParams) return;
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(
        (conv) => conv.id === conversationId,
      );
      if (
        conversation &&
        (!selectedConversation || selectedConversation.id !== conversationId)
      ) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations, selectedConversation]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to first unread message or bottom if no unread messages
  const scrollToFirstUnreadOrBottom = (messages: ChatMessage[]) => {
    const firstUnreadMessage = messages.find(
      (msg) => !msg.read_by_current_user && msg.sender_id !== currentUserId,
    );
    if (firstUnreadMessage) {
      const messageElement = document.getElementById(
        `message-${firstUnreadMessage.id}`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTimeout(() => scrollToBottom(), 100);
      }
    } else {
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const loadMessages = useCallback(async (conversationId: string) => {
    const result = await getMessages(conversationId);
    if (result.success && result.messages) {
      setMessages(result.messages);
      setTimeout(() => scrollToFirstUnreadOrBottom(result.messages!), 100);
    }
  }, []);

  // Load messages for selected conversation and mark as read
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, unread_count: 0 }
            : conv,
        ),
      );
    }
  }, [selectedConversation, loadMessages]);

  // Enhanced polling for conversations with tab visibility and longer intervals
  useEffect(() => {
    let conversationInterval: ReturnType<typeof setInterval>;
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        pollForConversations();
      }
    };

    const pollForConversations = async () => {
      if (!isTabVisible) return;

      try {
        const { getConversations } = await import(
          '@/server/domains/messages/actions'
        );
        // Get conversationId from URL
        const conversationId = searchParams
          ? searchParams.get('conversation') || undefined
          : undefined;
        const result = await getConversations(conversationId);
        if (result.success && result.conversations) {
          setConversations(result.conversations);
        }
      } catch (error) {
        console.error('Failed to poll conversations:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const startPolling = () => {
      conversationInterval = setInterval(() => {
        if (isTabVisible) {
          pollForConversations();
        }
      }, 30000);
    };

    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(conversationInterval);
    };
  }, [searchParams]);

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
        pollForMessages();
      }
    };

    const handleUserInteraction = () => {
      lastInteractionTime = Date.now();
    };

    const pollForMessages = async () => {
      if (!isTabVisible) return;

      const result = await getMessages(selectedConversation.id);
      if (result.success && result.messages) {
        const newMessages = result.messages;
        setMessages((prev) => {
          if (newMessages.length !== prev.length) {
            return newMessages;
          }
          return prev;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    const conservativePolling = () => {
      if (!isTabVisible) return;

      const timeSinceInteraction = Date.now() - lastInteractionTime;

      if (timeSinceInteraction > 300000) {
        pollForMessages();
      }

      messageInterval = setTimeout(conservativePolling, 300000);
    };

    conservativePolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      clearTimeout(messageInterval);
    };
  }, [selectedConversation]);


  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const maxFiles = 5;
    const currentCount = selectedImages.length;
    const availableSlots = maxFiles - currentCount;

    if (files.length > availableSlots) {
      toast({
        variant: 'destructive',
        title: 'Too many files',
        description: `You can only upload ${availableSlots} more image(s). Maximum is ${maxFiles} images per message.`,
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description:
            'Only JPEG, PNG, GIF, WebP, and HEIC images are allowed.',
        });
        return;
      }
      if (file.size > maxSize) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `"${file.name}" is too large. Maximum size is 10MB.`,
        });
        return;
      }
    }

    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const compressedFile = await compressImage(file);
          // Always use compressed WebP file for both preview and upload
          return {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
          };
        }),
      );

      setSelectedImages((prev) => [...prev, ...newImages]);
      toast({
        title: 'Images selected',
        description: `${newImages.length} image(s) ready to send.`,
      });
    } catch (error) {
      console.error('Error processing images:', error);
      toast({
        variant: 'destructive',
        title: 'Error processing images',
        description: 'Failed to process selected images.',
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const newImages = [...prev];
      if (newImages[index]) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (): Promise<
    Array<{ url: string; type: 'image'; file_name: string; file_size: number }>
  > => {
    if (selectedImages.length === 0) return [];

    try {
      const uploadPromises = selectedImages.map(async (image) => {
        const formData = new FormData();
        formData.append('file', image.file);

        const { data, error } = await supabase.storage
          .from('message-attachments')
          .upload(`${Date.now()}-${image.file.name}`, image.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(data.path);

        return {
          url: publicUrl,
          type: 'image' as const,
          file_name: image.file.name,
          file_size: image.file.size,
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload images. Please try again.',
      });
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (
      !selectedConversation ||
      (!newMessage.trim() && selectedImages.length === 0)
    )
      return;

    setIsLoading(true);
    try {
      const attachments = await uploadImages();
      const result = await sendMessage(
        selectedConversation.id,
        newMessage,
        attachments,
      );

      if (result.success) {
        setNewMessage('');
        setSelectedImages([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        const messagesResult = await getMessages(selectedConversation.id);
        if (messagesResult.success && messagesResult.messages) {
          setMessages(messagesResult.messages);

          if (result.message) {
            setConversations((prev) => {
              const updatedConversations = prev.map((conv) =>
                conv.id === selectedConversation.id
                  ? {
                      ...conv,
                      last_message: result.message!,
                      updated_at: result.message!.created_at,
                      unread_count: 0,
                    }
                  : conv,
              );

              const targetConv = updatedConversations.find(
                (conv) => conv.id === selectedConversation.id,
              );
              const otherConvs = updatedConversations.filter(
                (conv) => conv.id !== selectedConversation.id,
              );

              return targetConv
                ? [targetConv, ...otherConvs]
                : updatedConversations;
            });

            setSelectedConversation((prev) =>
              prev
                ? {
                    ...prev,
                    last_message: result.message!,
                    updated_at: result.message!.created_at,
                    unread_count: 0,
                  }
                : null,
            );
          }

          setTimeout(() => scrollToBottom(), 100);
        }
      } else {
        console.error('Failed to send message:', result.error);
        toast({
          variant: 'destructive',
          title: 'Failed to send message',
          description: result.error || 'Please try again.',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error sending message',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = async (professionalId: string) => {
    setIsLoading(true);
    const result = await createOrGetConversationEnhanced(professionalId);

    if (result.success && result.conversation) {
      const professional = availableProfessionals.find(
        (p) => p.id === professionalId,
      );
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

        setConversations((prev) => {
          const filtered = prev.filter(
            (conv) => conv.id !== newConversation.id,
          );
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
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
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

  // Check if professional is published (available for messaging)
  const isProfessionalPublished = (professionalId: string) => {
    return availableProfessionals.some((prof) => prof.id === professionalId);
  };

  // Get display text for last message
  const getLastMessageDisplay = (message: ChatMessage | undefined) => {
    if (!message) return 'No messages yet';

    if (
      message.attachments &&
      message.attachments.length > 0 &&
      !message.content.trim()
    ) {
      const count = message.attachments.length;
      return count === 1 ? '📷 Photo' : `📷 ${count} Photos`;
    }

    if (
      message.attachments &&
      message.attachments.length > 0 &&
      message.content.trim()
    ) {
      return `📷 ${message.content}`;
    }

    return message.content;
  };

  const toggleExpandedImages = (messageId: string) => {
    setExpandedMessageImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [selectedImages]);

  if (
    conversations.length === 0 &&
    !isProfessional &&
    availableProfessionals.length === 0
  ) {
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
      </div>

      {showNewConversation && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <Typography variant="h4">Start New Conversation</Typography>
          </div>
          <div className="p-6 space-y-3">
            {availableProfessionals
              .filter(
                (professional) =>
                  !conversations.some(
                    (conv) => conv.other_user.id === professional.id,
                  ),
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
                        {getInitials(
                          professional.first_name,
                          professional.last_name,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Typography className="font-semibold">
                        {professional.first_name} {professional.last_name}
                      </Typography>
                      {professional.profession && (
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          {professional.profession}
                        </Typography>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={isLoading}
                    className="rounded-full px-6"
                  >
                    Message
                  </Button>
                </div>
              ))}
            {availableProfessionals.filter(
              (professional) =>
                !conversations.some(
                  (conv) => conv.other_user.id === professional.id,
                ),
            ).length === 0 && (
              <div className="text-center py-8">
                <Typography className="text-muted-foreground">
                  You already have conversations with all available
                  professionals.
                </Typography>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-200px)] lg:h-auto max-h-[600px]">
        {/* Conversations List */}
        <div
          className={`lg:col-span-1 bg-white rounded-lg border shadow-sm ${
            selectedConversation ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-4 lg:p-6 border-b">
            <Typography
              variant="h4"
              className="font-semibold text-lg lg:text-xl"
            >
              Conversations
            </Typography>
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
                  const displayUnreadCount =
                    selectedConversation?.id === conversation.id
                      ? 0
                      : conversation.unread_count;

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
                            <AvatarImage
                              src={conversation.other_user.profile_photo_url}
                            />
                            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                              {getInitials(
                                conversation.other_user.first_name,
                                conversation.other_user.last_name,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {displayUnreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">
                                {displayUnreadCount > 9
                                  ? '9+'
                                  : displayUnreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex-1 min-w-0 mr-2">
                              <Typography
                                className="font-medium truncate text-sm"
                                title={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}
                              >
                                {conversation.other_user.first_name}{' '}
                                {conversation.other_user.last_name}
                              </Typography>
                            </div>
                            {conversation.last_message && (
                              <Typography
                                variant="small"
                                className="text-muted-foreground text-xs flex-shrink-0"
                              >
                                {formatTime(
                                  conversation.last_message.created_at,
                                )}
                              </Typography>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Typography
                              variant="small"
                              className={`truncate text-xs block ${
                                displayUnreadCount > 0
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground'
                              }`}
                              title={getLastMessageDisplay(
                                conversation.last_message,
                              )}
                            >
                              {getLastMessageDisplay(conversation.last_message)}
                            </Typography>
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
        <div
          className={`flex flex-col lg:col-span-2 bg-white rounded-lg border shadow-sm ${
            selectedConversation ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedConversation ? (
            <>
              <div className="p-4 lg:p-6 border-b">
                <div className="flex items-center gap-3 lg:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </Button>

                  {/* Professional Avatar and Info - Clickable if client and professional is published */}
                  {!isProfessional &&
                  isProfessionalPublished(
                    selectedConversation.other_user.id,
                  ) ? (
                    <Link
                      href={`/professionals/${selectedConversation.other_user.id}`}
                      className="flex items-center gap-3 lg:gap-4 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                        <AvatarImage
                          src={
                            selectedConversation.other_user.profile_photo_url
                          }
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                          {getInitials(
                            selectedConversation.other_user.first_name,
                            selectedConversation.other_user.last_name,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Typography
                          variant="h4"
                          className="font-semibold text-base lg:text-xl truncate hover:text-primary transition-colors"
                        >
                          {selectedConversation.other_user.first_name}{' '}
                          {selectedConversation.other_user.last_name}
                        </Typography>
                        <Typography
                          variant="small"
                          className="text-muted-foreground text-xs lg:text-sm"
                        >
                          Professional
                        </Typography>
                      </div>
                    </Link>
                  ) : (
                    <>
                      <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                        <AvatarImage
                          src={
                            selectedConversation.other_user.profile_photo_url
                          }
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                          {getInitials(
                            selectedConversation.other_user.first_name,
                            selectedConversation.other_user.last_name,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Typography
                          variant="h4"
                          className="font-semibold text-base lg:text-xl truncate"
                        >
                          {selectedConversation.other_user.first_name}{' '}
                          {selectedConversation.other_user.last_name}
                        </Typography>
                        <Typography
                          variant="small"
                          className="text-muted-foreground text-xs lg:text-sm"
                        >
                          {isProfessional ? 'Client' : 'Professional'}
                        </Typography>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col flex-grow h-[400px] lg:h-[500px]">
                <div className="flex-1 p-3 lg:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {isLoading && messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Typography className="text-muted-foreground">
                        Loading messages...
                      </Typography>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Typography className="text-muted-foreground">
                        No messages yet. Start the conversation!
                      </Typography>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isExpanded = expandedMessageImages.has(
                          message.id,
                        );

                        return (
                          <div
                            key={message.id}
                            id={`message-${message.id}`}
                            className={`flex items-end gap-2 ${
                              message.sender_id === currentUserId
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >
                            {message.sender_id !== currentUserId && (
                              <Avatar className="h-5 w-5 lg:h-6 lg:w-6 mb-1 hidden sm:block">
                                <AvatarImage
                                  src={
                                    selectedConversation.other_user
                                      .profile_photo_url
                                  }
                                />
                                <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                                  {getInitials(
                                    selectedConversation.other_user.first_name,
                                    selectedConversation.other_user.last_name,
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
                              {message.attachments &&
                                message.attachments.length > 0 && (
                                  <div className="mb-2">
                                    {/* Horizontal layout for images */}
                                    {isExpanded ||
                                    message.attachments.length <= 2 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {message.attachments.map(
                                          (attachment) => (
                                            <Dialog key={attachment.id}>
                                              <DialogTrigger asChild>
                                                <div className="relative w-20 h-20 cursor-pointer hover:opacity-90 transition-opacity">
                                                  <NextImage
                                                    src={attachment.url}
                                                    alt={attachment.file_name}
                                                    width={80}
                                                    height={80}
                                                    className="w-full h-full object-cover rounded-lg"
                                                  />
                                                </div>
                                              </DialogTrigger>
                                              <DialogContent
                                                closeButton={false}
                                                className="max-w-4xl max-h-[90vh] w-full h-full p-0 border-0"
                                              >
                                                <VisuallyHidden>
                                                  <DialogTitle>
                                                    Image:{' '}
                                                    {attachment.file_name}
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    Full size view of{' '}
                                                    {attachment.file_name}
                                                  </DialogDescription>
                                                </VisuallyHidden>
                                                <div className="relative w-full h-[90vh] bg-black/90 flex items-center justify-center">
                                                  <div className="relative w-full h-full max-w-4xl max-h-full">
                                                    <NextImage
                                                      src={attachment.url}
                                                      alt={attachment.file_name}
                                                      fill
                                                      className="object-contain"
                                                    />
                                                  </div>
                                                  <DialogClose asChild>
                                                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm">
                                                      <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M6 18L18 6M6 6l12 12"
                                                        />
                                                      </svg>
                                                    </button>
                                                  </DialogClose>
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                          ),
                                        )}
                                        {message.attachments.length > 2 &&
                                          !isExpanded && (
                                            <button
                                              onClick={() =>
                                                toggleExpandedImages(message.id)
                                              }
                                              className="relative w-20 h-20 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                                            >
                                              <span className="text-sm font-semibold">
                                                +
                                                {message.attachments.length - 2}
                                              </span>
                                            </button>
                                          )}
                                      </div>
                                    ) : (
                                      <div className="flex gap-1">
                                        {message.attachments
                                          .slice(0, 2)
                                          .map((attachment) => (
                                            <Dialog key={attachment.id}>
                                              <DialogTrigger asChild>
                                                <div className="relative w-20 h-20 cursor-pointer hover:opacity-90 transition-opacity">
                                                  <NextImage
                                                    src={attachment.url}
                                                    alt={attachment.file_name}
                                                    width={80}
                                                    height={80}
                                                    className="w-full h-full object-cover rounded-lg"
                                                  />
                                                </div>
                                              </DialogTrigger>
                                              <DialogContent
                                                closeButton={false}
                                                className="max-w-4xl max-h-[90vh] w-full h-full p-0 border-0"
                                              >
                                                <VisuallyHidden>
                                                  <DialogTitle>
                                                    Image:{' '}
                                                    {attachment.file_name}
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    Full size view of{' '}
                                                    {attachment.file_name}
                                                  </DialogDescription>
                                                </VisuallyHidden>
                                                <div className="relative w-full h-[90vh] bg-black/90 flex items-center justify-center">
                                                  <div className="relative w-full h-full max-w-4xl max-h-full">
                                                    <NextImage
                                                      src={attachment.url}
                                                      alt={attachment.file_name}
                                                      fill
                                                      className="object-contain"
                                                    />
                                                  </div>
                                                  <DialogClose asChild>
                                                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm">
                                                      <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M6 18L18 6M6 6l12 12"
                                                        />
                                                      </svg>
                                                    </button>
                                                  </DialogClose>
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                          ))}
                                        {message.attachments.length > 2 && (
                                          <button
                                            onClick={() =>
                                              toggleExpandedImages(message.id)
                                            }
                                            className="relative w-20 h-20 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                                          >
                                            <span className="text-sm font-semibold">
                                              +{message.attachments.length - 2}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {message.attachments.length > 2 &&
                                      isExpanded && (
                                        <button
                                          onClick={() =>
                                            toggleExpandedImages(message.id)
                                          }
                                          className={`text-xs mt-1 hover:underline ${
                                            message.sender_id === currentUserId
                                              ? 'text-white/70 text-right w-full'
                                              : 'text-muted-foreground'
                                          }`}
                                        >
                                          Show less
                                        </button>
                                      )}
                                  </div>
                                )}
                              {message.content && (
                                <Typography
                                  variant="small"
                                  className={cn(
                                    'leading-relaxed text-sm break-words',
                                    message.sender_id === currentUserId &&
                                      'text-white',
                                  )}
                                >
                                  {message.content}
                                </Typography>
                              )}
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
                              <div className="h-5 w-5 lg:h-6 lg:w-6 mb-1 hidden sm:block" />
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="border-t p-3 !pt-2 lg:p-4">
                  {selectedImages.length > 0 && (
                    <div className="mb-2 pt-1 flex gap-3 overflow-x-auto">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative flex-shrink-0 p-1">
                          <NextImage
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            width={80}
                            height={80}
                            className="h-20 w-20 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90 transition-colors z-10"
                            style={{ width: '24px', height: '24px' }}
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg flex-shrink-0"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        isLoading ||
                        (!newMessage.trim() && selectedImages.length === 0)
                      }
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
                Choose a conversation from the list to start messaging, or
                create a new conversation with an available professional.
              </Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
