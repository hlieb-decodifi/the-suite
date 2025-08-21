'use server';

import { createClient } from '@/lib/supabase/server';
import { ConversationWithUser, ChatMessage, Conversation } from '@/types/messages';
import { revalidatePath } from 'next/cache';

/**
 * Get conversations for the current user
 */
export async function getConversations(conversationId?: string): Promise<{
  success: boolean;
  conversations?: ConversationWithUser[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is professional or client
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });

    // Get only general conversations for current user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('purpose', 'general') // Only show general conversations
      .or(isProfessional 
        ? `professional_id.eq.${user.id}`
        : `client_id.eq.${user.id}`
      )
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { success: false, error: 'Failed to fetch conversations' };
    }

    // Transform conversations to include other user details
    const conversationsWithUsers = await Promise.all(
      (conversations || []).map(async (conversation) => {
        // Get the other user's details
        const otherUserId = isProfessional ? conversation.client_id : conversation.professional_id;
        const { data: otherUser, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            profile_photos (url)
          `)
          .eq('id', otherUserId)
          .single();

        if (userError) {
          console.error('Error fetching other user:', userError);
          return null;
        }

        // Get last message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select(`
            *,
            attachments:message_attachments(*)
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Transform lastMessage to match ChatMessage type
        const lastMessage = lastMessageData ? {
          id: lastMessageData.id,
          conversation_id: lastMessageData.conversation_id,
          sender_id: lastMessageData.sender_id,
          content: lastMessageData.content,
          is_read: lastMessageData.is_read,
          created_at: lastMessageData.created_at,
          updated_at: lastMessageData.updated_at,
          attachments: lastMessageData.attachments?.map(att => ({
            id: att.id,
            message_id: att.message_id,
            url: att.url,
            type: 'image' as const,
            file_name: att.file_name,
            file_size: att.file_size,
            created_at: att.created_at
          })) || []
        } : undefined;

        // Count unread messages for the current user
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        return {
          ...conversation,
          other_user: {
            id: otherUser?.id || '',
            first_name: otherUser?.first_name || '',
            last_name: otherUser?.last_name || '',
            profile_photo_url: Array.isArray(otherUser?.profile_photos) 
              ? otherUser.profile_photos[0]?.url 
              : otherUser?.profile_photos?.url || undefined,
          },
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        };
      })
    );

    // Filter out null values, and keep conversations that have messages OR match the provided conversationId.
    const validConversations = conversationsWithUsers.filter((conv): conv is NonNullable<typeof conv> => 
      conv !== null && (conv.last_message !== undefined || conv.id === conversationId)
    );

    return { success: true, conversations: validConversations };
  } catch (error) {
    console.error('Error in getConversations:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(conversationId: string): Promise<{
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user has access to this conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
      .single();

    if (conversationError || !conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    // Get messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return { success: false, error: 'Failed to fetch messages' };
    }

    // Transform the data to match our ChatMessage type
    const messages = (messagesData || []).map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      is_read: msg.is_read,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      attachments: msg.attachments?.map(att => ({
        id: att.id,
        message_id: att.message_id,
        url: att.url,
        type: 'image' as const,
        file_name: att.file_name,
        file_size: att.file_size,
        created_at: att.created_at
      })) || []
    })) as ChatMessage[];

    return { success: true, messages: messages };
  } catch (error) {
    console.error('Error in getMessages:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: Array<{
    url: string;
    type: 'image';
    file_name: string;
    file_size: number;
  }>
): Promise<{
  success: boolean;
  message?: ChatMessage;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user has access to this conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
      .single();

    if (conversationError || !conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    // Start a transaction
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return { success: false, error: 'Failed to send message' };
    }

    // If there are attachments, insert them
    if (attachments && attachments.length > 0) {
      const { error: attachmentsError } = await supabase
        .from('message_attachments')
        .insert(
          attachments.map(attachment => ({
            message_id: message.id,
            url: attachment.url,
            type: attachment.type,
            file_name: attachment.file_name,
            file_size: attachment.file_size,
          }))
        );

      if (attachmentsError) {
        console.error('Error saving attachments:', attachmentsError);
        // We don't return error here as the message was sent successfully
      }
    }

    // Get the complete message with attachments
    const { data: completeMessage, error: fetchError } = await supabase
      .from('messages')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('id', message.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete message:', fetchError);
      return { success: true, message }; // Return message without attachments if fetch fails
    }

    // Transform the data to match our ChatMessage type
    const transformedMessage: ChatMessage = {
      id: completeMessage.id,
      conversation_id: completeMessage.conversation_id,
      sender_id: completeMessage.sender_id,
      content: completeMessage.content,
      is_read: completeMessage.is_read,
      created_at: completeMessage.created_at,
      updated_at: completeMessage.updated_at,
      attachments: completeMessage.attachments?.map(att => ({
        id: att.id,
        message_id: att.message_id,
        url: att.url,
        type: 'image' as const,
        file_name: att.file_name,
        file_size: att.file_size,
        created_at: att.created_at
      })) || []
    };

    revalidatePath('/dashboard/messages');
    return { success: true, message: transformedMessage };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Mark all messages in conversation as read (except those sent by current user)
    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return { success: false, error: 'Failed to mark messages as read' };
    }

    revalidatePath('/dashboard/messages');
    return { success: true };
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create or get conversation between users (enhanced version)
 * Supports the new RLS policy that allows conversation creation based on:
 * 1. Users with shared appointments (either can start)
 * 2. Users without shared appointments (only client can start if professional allows messages)
 */
export async function createOrGetConversationEnhanced(
  targetUserId: string
): Promise<{
  success: boolean;
  conversation?: Conversation;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check user roles
    const { data: isCurrentUserClient } = await supabase.rpc('is_client', {
      user_uuid: user.id,
    });
    const { data: isCurrentUserProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });
    const { data: isTargetClient } = await supabase.rpc('is_client', {
      user_uuid: targetUserId,
    });
    const { data: isTargetProfessional } = await supabase.rpc('is_professional', {
      user_uuid: targetUserId,
    });

    // Determine conversation participant roles
    let clientId: string;
    let professionalId: string;

    if (isCurrentUserClient && isTargetProfessional) {
      clientId = user.id;
      professionalId = targetUserId;
    } else if (isCurrentUserProfessional && isTargetClient) {
      clientId = targetUserId;
      professionalId = user.id;
    } else {
      return { success: false, error: 'Conversations can only be created between clients and professionals' };
    }

    // Check if general conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .eq('professional_id', professionalId)
      .eq('purpose', 'general')
      .single();

    if (existingConversation) {
      return { success: true, conversation: existingConversation };
    }

    // Check if users have shared appointments
    // First get the professional profile ID
    const { data: professionalProfile } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', professionalId)
      .single();

    if (!professionalProfile) {
      return { success: false, error: 'Professional profile not found' };
    }

    const { data: sharedAppointments } = await supabase
      .from('bookings')
      .select('id')
      .eq('client_id', clientId)
      .eq('professional_profile_id', professionalProfile.id)
      .limit(1);

    const hasSharedAppointments = sharedAppointments && sharedAppointments.length > 0;

    // If they have shared appointments, either user can create conversation
    if (hasSharedAppointments) {
      // Try to create the conversation - RLS will handle the validation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          client_id: clientId,
          professional_id: professionalId,
          purpose: 'general'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return { success: false, error: 'Failed to create conversation' };
      }

      return { success: true, conversation: newConversation };
    }

    // If no shared appointments, check if current user is client and professional allows messages
    if (!isCurrentUserClient) {
      return { success: false, error: 'Only clients can start conversations with professionals they haven\'t worked with' };
    }

    // Check if professional allows messages
    const { data: professional, error: professionalError } = await supabase
      .from('professional_profiles')
      .select('allow_messages')
      .eq('user_id', professionalId)
      .single();

    if (professionalError || !professional) {
      return { success: false, error: 'Professional not found' };
    }

    if (!professional.allow_messages) {
      return { success: false, error: 'This professional does not accept messages from new clients' };
    }

    // Try to create the conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        professional_id: professionalId,
        purpose: 'general'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return { success: false, error: 'Failed to create conversation' };
    }

    revalidatePath('/dashboard/messages');
    return { success: true, conversation: newConversation };
  } catch (error) {
    console.error('Error in createOrGetConversationEnhanced:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get available professionals for messaging (clients only)
 */
export async function getAvailableProfessionals(): Promise<{
  success: boolean;
  professionals?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profession?: string | undefined;
    profile_photo_url?: string | undefined;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify current user is a client
    const { data: isClient } = await supabase.rpc('is_client', {
      user_uuid: user.id,
    });

    if (!isClient) {
      return { success: false, error: 'Only clients can view available professionals' };
    }

    // Get professionals who allow messages
    const { data: professionals, error: professionalsError } = await supabase
      .from('professional_profiles')
      .select(`
        user_id,
        profession,
        users:user_id (
          id,
          first_name,
          last_name,
          profile_photos (url)
        )
      `)
      .eq('allow_messages', true)
      .eq('is_published', true);

    if (professionalsError) {
      console.error('Error fetching professionals:', professionalsError);
      return { success: false, error: 'Failed to fetch professionals' };
    }

    const formattedProfessionals = (professionals || []).map((prof) => ({
      id: prof.users.id,
      first_name: prof.users.first_name,
      last_name: prof.users.last_name,
      profession: prof.profession || undefined,
      profile_photo_url: Array.isArray(prof.users.profile_photos) 
        ? prof.users.profile_photos[0]?.url 
        : prof.users.profile_photos?.url || undefined,
    }));

    return { success: true, professionals: formattedProfessionals };
  } catch (error) {
    console.error('Error in getAvailableProfessionals:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get recent conversations for dashboard (limit 2)
 */
export async function getRecentConversations(): Promise<{
  success: boolean;
  conversations?: ConversationWithUser[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is professional or client
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });

    // Get recent general conversations for current user (limit to 2 for dashboard)
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('purpose', 'general') // Only show general conversations
      .or(isProfessional 
        ? `professional_id.eq.${user.id}`
        : `client_id.eq.${user.id}`
      )
      .order('updated_at', { ascending: false })
      .limit(2);

    if (conversationsError) {
      console.error('Error fetching recent conversations:', conversationsError);
      return { success: false, error: 'Failed to fetch conversations' };
    }

    if (!conversations || conversations.length === 0) {
      return { success: true, conversations: [] };
    }

    // Transform conversations to include other user details
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conversation) => {
        // Get the other user's details
        const otherUserId = isProfessional ? conversation.client_id : conversation.professional_id;
        const { data: otherUser, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            profile_photos (url)
          `)
          .eq('id', otherUserId)
          .single();

        if (userError) {
          console.error('Error fetching other user:', userError);
          return null;
        }

        // Get last message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select(`
            *,
            attachments:message_attachments(*)
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Transform lastMessage to match ChatMessage type
        const lastMessage = lastMessageData ? {
          id: lastMessageData.id,
          conversation_id: lastMessageData.conversation_id,
          sender_id: lastMessageData.sender_id,
          content: lastMessageData.content,
          is_read: lastMessageData.is_read,
          created_at: lastMessageData.created_at,
          updated_at: lastMessageData.updated_at,
          attachments: lastMessageData.attachments?.map(att => ({
            id: att.id,
            message_id: att.message_id,
            url: att.url,
            type: 'image' as const,
            file_name: att.file_name,
            file_size: att.file_size,
            created_at: att.created_at
          })) || []
        } : undefined;

        // Count unread messages for the current user
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        return {
          ...conversation,
          other_user: {
            id: otherUser?.id || '',
            first_name: otherUser?.first_name || '',
            last_name: otherUser?.last_name || '',
            profile_photo_url: Array.isArray(otherUser?.profile_photos) 
              ? otherUser.profile_photos[0]?.url 
              : otherUser?.profile_photos?.url || undefined,
          },
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        };
      })
    );

    // Filter out null values and conversations without messages
    const validConversations = conversationsWithUsers.filter((conv): conv is NonNullable<typeof conv> => 
      conv !== null && conv.last_message !== undefined
    );
    
    return { success: true, conversations: validConversations };
  } catch (error) {
    console.error('Error in getRecentConversations:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 