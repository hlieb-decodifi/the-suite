import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/server/lib/auth';

/**
 * Fetch all messages for a support request (admin only).
 */
export async function getAdminSupportRequestMessages(supportRequestId: string) {
  // 1. Check user is admin
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return adminCheck;
  }

  // 2. Use admin client to fetch all messages for the support request
  const adminSupabase = await createAdminClient();

  // Fetch the conversation id for this support request
  const { data: supportRequest, error: supportRequestError } =
    await adminSupabase
      .from('support_requests')
      .select('conversation_id')
      .eq('id', supportRequestId)
      .single();

  if (supportRequestError || !supportRequest) {
    return { success: false, error: 'Support request not found' };
  }

  // Fetch all messages for the conversation
  const { data: messages, error: messagesError } = await adminSupabase
    .from('messages')
    .select('*')
    .eq('conversation_id', supportRequest.conversation_id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return { success: false, error: 'Failed to fetch messages' };
  }

  // Collect all unique sender IDs
  const senderIds = Array.from(
    new Set((messages || []).map((msg) => msg.sender_id)),
  );

  const usersMap: Record<
    string,
    {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
    }
  > = {};
  if (senderIds.length > 0) {
    // Fetch all users for these sender IDs, including profile photos
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('id, first_name, last_name, profile_photos(url)')
      .in('id', senderIds);

    if (usersError) {
      return { success: false, error: 'Failed to fetch users' };
    }

    for (const user of users || []) {
      let photoUrl: string | undefined = undefined;
      if (user.profile_photos) {
        if (Array.isArray(user.profile_photos)) {
          if (user.profile_photos.length > 0) {
            photoUrl = user.profile_photos[0].url;
          }
        } else if (user.profile_photos.url) {
          photoUrl = user.profile_photos.url;
        }
      }
      usersMap[user.id] = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        ...(photoUrl ? { profile_photo_url: photoUrl } : {}),
      };
    }
  }

  return { success: true, messages, users: usersMap };
}
