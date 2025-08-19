import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Fetch all general conversations for admin, filtered by last message date range.
 */
export async function getAllGeneralConversationsForAdmin({ start, end }: { start: string; end: string }) {
  // 1. Check user is admin using regular client
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  const sessionUser = sessionData?.user;
  if (sessionError || !sessionUser) {
    return { success: false, error: 'Not authenticated' };
  }
  // Get user role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', sessionUser.id)
    .single();
  if (userError || !userData) {
    return { success: false, error: 'User not found' };
  }
  // Get admin role id
  const { data: adminRole, error: adminRoleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .single();
  if (adminRoleError || !adminRole) {
    return { success: false, error: 'Admin role not found' };
  }
  if (userData.role_id !== adminRole.id) {
    return { success: false, error: 'Permission denied: admin only' };
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

  // For each conversation, get the last message and both users' info, filter by date
  const conversationsWithUsers = await Promise.all(
    (conversations || []).map(async (conversation) => {
      // Fetch last message
      const { data: lastMessage } = await adminSupabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!lastMessage) return null;
      const lastMessageDate = new Date(lastMessage.created_at);
  if (lastMessageDate < new Date(start) || lastMessageDate > new Date(new Date(end).setHours(23,59,59,999))) return null;

      // Fetch client user info
      const { data: clientUser, error: clientUserError } = await adminSupabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', conversation.client_id)
        .single();
      if (!clientUser || clientUserError) {
  console.error('[AdminMessages] Client user not found for id:', conversation.client_id, clientUserError);
      }

      // Fetch professional user info
      const { data: professionalUser, error: professionalUserError } = await adminSupabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', conversation.professional_id)
        .single();
      if (!professionalUser || professionalUserError) {
  console.error('[AdminMessages] Professional user not found for id:', conversation.professional_id, professionalUserError);
      }

      return {
        ...conversation,
        last_message: lastMessage,
        client_user: clientUser || null,
        professional_user: professionalUser || null,
      };
    })
  );

  // Filter out nulls
  const filtered = conversationsWithUsers.filter(Boolean);

  return { success: true, conversations: filtered };
}
