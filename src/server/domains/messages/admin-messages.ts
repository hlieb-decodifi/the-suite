import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/server/lib/auth';
import { ChatMessage } from '@/types/messages';

/**
 * Fetch all messages for a conversation (admin, with admin role check).
 */
export async function getMessagesForAdmin(
  conversationId: string,
): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  try {
    // 1. Check user is admin using shared utility
    const adminCheck = await requireAdminUser();
    if (!adminCheck.success) {
      return adminCheck;
    }

    // 2. Use admin client to fetch messages
    const adminSupabase = createAdminClient();
    const { data: messagesData, error: messagesError } = await adminSupabase
      .from('messages')
      .select(`*, attachments:message_attachments(*)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (messagesError) {
      return { success: false, error: 'Failed to fetch messages' };
    }
    const messages = (messagesData || []).map((msg) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      attachments:
        msg.attachments?.map((att) => ({
          id: att.id,
          message_id: att.message_id,
          url: att.url,
          type: 'image' as const,
          file_name: att.file_name,
          file_size: att.file_size,
          created_at: att.created_at,
        })) || [],
    })) as ChatMessage[];
    return { success: true, messages };
  } catch {
    return { success: false, error: 'An unexpected error occurred' };
  }
}
