import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/server/lib/auth';

/**
 * Fetch all general conversations for admin, filtered by last message date range.
 */
export async function getAllGeneralConversationsForAdmin({ start, end }: { start: string; end: string }) {
  // 1. Check user is admin using shared utility
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return adminCheck;
  }

  // 2. Use admin client to fetch all conversations/messages
  const adminSupabase = await createAdminClient();
  const { data: conversations, error } = await adminSupabase
    .from('conversations')
    .select('*')
    .eq('purpose', 'general');

  if (error) {
    return { success: false, error: 'Failed to fetch conversations' };
  }

  // If no conversations, return early
  if (!conversations || conversations.length === 0) {
    return { success: true, conversations: [] };
  }

  // Collect all conversation IDs, client IDs, and professional IDs
  const conversationIds = conversations.map((c) => c.id);
  const clientIds = conversations.map((c) => c.client_id);
  const professionalIds = conversations.map((c) => c.professional_id);
  const allUserIds = Array.from(new Set([...clientIds, ...professionalIds]));

  // Fetch all last messages for these conversations in a single query
  const { data: allMessages, error: messagesError } = await adminSupabase
    .from('messages')
    .select('*')
    .in('conversation_id', conversationIds);
  if (messagesError) {
    return { success: false, error: 'Failed to fetch messages' };
  }

  // For each conversation, get the last message (by created_at desc)
  const lastMessagesMap = new Map();
  for (const msg of allMessages || []) {
    const prev = lastMessagesMap.get(msg.conversation_id);
    if (!prev || new Date(msg.created_at) > new Date(prev.created_at)) {
      lastMessagesMap.set(msg.conversation_id, msg);
    }
  }

  // Fetch all users in a single query
  const { data: allUsers, error: usersError } = await adminSupabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', allUserIds);
  if (usersError) {
    return { success: false, error: 'Failed to fetch users' };
  }
  const usersMap = new Map();
  for (const user of allUsers || []) {
    usersMap.set(user.id, user);
  }

  // Assemble the result
  const filtered = (conversations || []).map((conversation) => {
    const lastMessage = lastMessagesMap.get(conversation.id);
    if (!lastMessage) return null;
    const lastMessageDate = new Date(lastMessage.created_at);
    if (
      lastMessageDate < new Date(start) ||
      lastMessageDate > new Date(new Date(end).setHours(23, 59, 59, 999))
    ) {
      return null;
    }
    const clientUser = usersMap.get(conversation.client_id) || null;
    const professionalUser = usersMap.get(conversation.professional_id) || null;
    if (!clientUser) {
      console.error('[AdminMessages] Client user not found for id:', conversation.client_id);
    }
    if (!professionalUser) {
      console.error('[AdminMessages] Professional user not found for id:', conversation.professional_id);
    }
    return {
      ...conversation,
      last_message: lastMessage,
      client_user: clientUser,
      professional_user: professionalUser,
    };
  }).filter(Boolean);

  return { success: true, conversations: filtered };
}
