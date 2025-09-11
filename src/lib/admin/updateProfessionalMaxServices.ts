import { createAdminClient, createClient } from '@/lib/supabase/server';


/**
 * Update the max_services value for a professional profile by userId (admin only)
 */
export async function updateProfessionalMaxServices(userId: string, maxServices: number): Promise<{ success: boolean; error?: string }> {
  // Role check: ensure current user is admin
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  const sessionUser = sessionData?.user;
  if (sessionError || !sessionUser) {
    return { success: false, error: 'Not authenticated' };
  }
  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', sessionUser.id)
    .single();
  if (userError || !userData) {
    return { success: false, error: 'User not found' };
  }
  // Check if user is admin
  const { data: userRoleData, error: userRoleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  if (userRoleError || !userRoleData || userRoleData.role !== 'admin') {
    return { success: false, error: 'Permission denied: admin only' };
  }

  // Use admin client for the update
  const adminSupabase = await createAdminClient();
  // Find professional profile by userId
  const { data: profile, error: profileError } = await adminSupabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (profileError || !profile) {
    return { success: false, error: 'Professional profile not found' };
  }
  // Upsert into service_limits table
  const { error: upsertError } = await adminSupabase
    .from('service_limits')
    .upsert([
      {
        professional_profile_id: profile.id,
        max_services: maxServices,
      },
    ], { onConflict: 'professional_profile_id' });
  if (upsertError) {
    return { success: false, error: upsertError.message };
  }
  return { success: true };
}
