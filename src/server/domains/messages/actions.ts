'use server';

import { createClient } from '@/lib/supabase/server';
import { ConversationWithUser, ChatMessage, Conversation } from '@/types/messages';
import { revalidatePath } from 'next/cache';

/**
 * Get conversations for the current user
 */
export async function getConversations(): Promise<{
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

    // Get conversations for current user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
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
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

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
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        };
      })
    );

    // Filter out null values and return valid conversations
    const validConversations = conversationsWithUsers.filter((conv): conv is NonNullable<typeof conv> => conv !== null);
    
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
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return { success: false, error: 'Failed to fetch messages' };
    }

    return { success: true, messages: messages || [] };
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
  content: string
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

    // Send message
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

    revalidatePath('/dashboard/messages');
    return { success: true, message };
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
 * Create or get conversation between client and professional
 */
export async function createOrGetConversation(
  professionalId: string
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

    // Verify current user is a client
    const { data: isClient } = await supabase.rpc('is_client', {
      user_uuid: user.id,
    });

    if (!isClient) {
      return { success: false, error: 'Only clients can start conversations' };
    }

    // Verify professional allows messages
    const { data: professional, error: professionalError } = await supabase
      .from('professional_profiles')
      .select('allow_messages')
      .eq('user_id', professionalId)
      .single();

    if (professionalError || !professional) {
      return { success: false, error: 'Professional not found' };
    }

    if (!professional.allow_messages) {
      return { success: false, error: 'This professional does not accept messages' };
    }

    // Try to get existing conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', user.id)
      .eq('professional_id', professionalId)
      .single();

    if (existingConversation) {
      return { success: true, conversation: existingConversation };
    }

    // Create new conversation if it doesn't exist
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        client_id: user.id,
        professional_id: professionalId,
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
    console.error('Error in createOrGetConversation:', error);
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