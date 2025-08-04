'use client';

import heic2any from 'heic2any';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';

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
  getMessages,
  markMessagesAsRead,
  sendMessage,
} from '@/server/domains/messages/actions';
import { ChatMessage } from '@/types/messages';
import { cn } from '@/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ImageIcon, SendIcon, XIcon } from 'lucide-react';

type SupportRequestChatWidgetProps = {
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  readOnly?: boolean;
  resolvedInfo?: {
    status: string;
    resolvedAt?: string | null;
    resolvedBy?: string | null;
    resolutionNotes?: string | null;
  } | undefined;
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

export function SupportRequestChatWidget({
  conversationId,
  currentUserId,
  otherUser,
  readOnly = false,
  resolvedInfo,
}: SupportRequestChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<{
    id: string;
    other_user: {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
    };
  } | null>(otherUser ? {
    id: conversationId,
    other_user: otherUser
  } : null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<
    Array<{ file: File; preview: string }>
  >([]);
  const [expandedMessageImages, setExpandedMessageImages] = useState<
    Set<string>
  >(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { toast } = useToast();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to first unread message or bottom if no unread messages
  const scrollToFirstUnreadOrBottom = (messages: ChatMessage[]) => {
    const firstUnreadMessage = messages.find(
      (msg) => !msg.is_read && msg.sender_id !== currentUserId,
    );
    if (firstUnreadMessage) {
      const messageElement = document.getElementById(
        `message-${firstUnreadMessage.id}`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Load messages and conversation data
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      markMessagesAsRead(conversationId);
      
      // Only set minimal conversation object if otherUser is not provided
      if (!otherUser) {
        setConversation({
          id: conversationId,
          other_user: {
            id: '',
            first_name: '',
            last_name: '',
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Enhanced polling for messages with user interaction awareness
  useEffect(() => {
    if (!conversationId) return;

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
      if (!isTabVisible || !conversationId) return;

      const result = await getMessages(conversationId);
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
  }, [conversationId]);

  const loadMessages = async (conversationId: string) => {
    const result = await getMessages(conversationId);
    if (result.success && result.messages) {
      setMessages(result.messages);
      setTimeout(() => scrollToFirstUnreadOrBottom(result.messages!), 100);
    }
  };

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
    if (!conversationId || (!newMessage.trim() && selectedImages.length === 0))
      return;

    setIsLoading(true);
    try {
      const attachments = await uploadImages();
      const result = await sendMessage(
        conversationId,
        newMessage,
        attachments,
      );

      if (result.success) {
        setNewMessage('');
        setSelectedImages([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        const messagesResult = await getMessages(conversationId);
        if (messagesResult.success && messagesResult.messages) {
          setMessages(messagesResult.messages);
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
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
              No messages yet. {!readOnly && "Start the conversation!"}
            </Typography>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resolution banner - only show in readOnly mode */}
            {readOnly && resolvedInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <Typography className="text-green-800 font-medium">
                    This support request has been {resolvedInfo.status}
                  </Typography>
                </div>
                {resolvedInfo.resolutionNotes && (
                  <Typography variant="small" className="text-green-700 mt-1">
                    {resolvedInfo.resolutionNotes}
                  </Typography>
                )}
              </div>
            )}
            
            {messages.map((message) => {
              const isExpanded = expandedMessageImages.has(message.id);

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
                        src={conversation?.other_user.profile_photo_url}
                      />
                      <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                        {conversation ? getInitials(
                          conversation.other_user.first_name,
                          conversation.other_user.last_name,
                        ) : ''}
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
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2">
                        {/* Horizontal layout for images */}
                        {isExpanded || message.attachments.length <= 2 ? (
                          <div className="flex flex-wrap gap-1">
                            {message.attachments.map((attachment) => (
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
                                      Image: {attachment.file_name}
                                    </DialogTitle>
                                    <DialogDescription>
                                      Full size view of {attachment.file_name}
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
                            {message.attachments.length > 2 && !isExpanded && (
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
                                        Image: {attachment.file_name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Full size view of {attachment.file_name}
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
                        {message.attachments.length > 2 && isExpanded && (
                          <button
                            onClick={() => toggleExpandedImages(message.id)}
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
                          message.sender_id === currentUserId && 'text-white',
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

      {/* Message Input - Only show if not readOnly */}
      {!readOnly ? (
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
      ) : (
        <div className="border-t p-3 bg-muted/20">
          <div className="flex items-center justify-center text-muted-foreground text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            This conversation is locked. No new messages can be sent.
          </div>
        </div>
      )}
    </div>
  );
}
