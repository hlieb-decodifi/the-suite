import { createAdminClient } from '@/lib/supabase/server';

/**
 * Update the max_services value for a professional profile by userId (admin only)
 */
export async function updateProfessionalMaxServices(userId: string, maxServices: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createAdminClient();
  // Find professional profile by userId
  const { data: profile, error: profileError } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (profileError || !profile) {
    return { success: false, error: 'Professional profile not found' };
  }
  // Update max_services
  const { error: updateError } = await supabase
    .from('professional_profiles')
    .update({ max_services: maxServices })
    .eq('id', profile.id);
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  return { success: true };
}
