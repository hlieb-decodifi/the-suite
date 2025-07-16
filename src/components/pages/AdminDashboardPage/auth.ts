import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Throws if not authenticated or not admin.
 * Returns the user object if authenticated and admin.
 */
export async function requireAdminUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id })
  if (!isAdmin) throw new Error('Not authorized')

  return user
} 