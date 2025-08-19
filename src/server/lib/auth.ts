import { createClient } from '@/lib/supabase/server';

/**
 * Checks if the current user is an admin. Returns the session user if admin, otherwise returns an error object.
 */
export async function requireAdminUser() {
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
  return { success: true, user: sessionUser };
}
