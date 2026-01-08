'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Checks if the current user is an admin. Returns the session user if admin, otherwise returns an error object.
 */
export async function requireAdminUser() {
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getUser();
  const sessionUser = sessionData?.user;
  if (sessionError || !sessionUser) {
    return { success: false, error: 'Not authenticated' };
  }
  // Check if user has admin role
  const { data: userRoleData, error: userRoleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', sessionUser.id)
    .single();
  if (userRoleError || !userRoleData || userRoleData.role !== 'admin') {
    return { success: false, error: 'Permission denied: admin only' };
  }
  return { success: true, user: sessionUser };
}
