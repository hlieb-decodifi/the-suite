import { createClient } from '@/lib/supabase/server';
import { Database } from '@/../supabase/types';
import { ProfileData, HeaderFormValues } from '@/types/profiles';

export async function getProfileFromDb(userId: string): Promise<ProfileData> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      professional_profiles (
        description,
        profession,
        phone_number,
        facebook_url,
        instagram_url,
        tiktok_url,
        is_published
      ),
      profile_photos (url)
    `)
    .eq('id', userId)
    .single();
  
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data) throw new Error('Profile not found');
  
  // Transform from snake_case DB model to camelCase client model
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    profession: data.professional_profiles?.profession ?? null,
    description: data.professional_profiles?.description ?? null,
    phoneNumber: data.professional_profiles?.phone_number ?? null,
    facebookUrl: data.professional_profiles?.facebook_url ?? null,
    instagramUrl: data.professional_profiles?.instagram_url ?? null,
    tiktokUrl: data.professional_profiles?.tiktok_url ?? null,
    photoUrl: data.profile_photos?.url ?? null,
    isPublished: data.professional_profiles?.is_published ?? null,
    isSubscribed: true, // Mock value - would be determined by subscription status in a real app
  };
}

export async function updateProfileHeaderInDb(userId: string, data: HeaderFormValues): Promise<void> {
  const supabase = await createClient();
  
  // Using proper database types for your updates
  const profileUpdate: Partial<Database['public']['Tables']['professional_profiles']['Update']> = {
    profession: data.profession || null,
    description: data.description || null,
    phone_number: data.phoneNumber || null,
    facebook_url: data.facebookUrl || null,
    instagram_url: data.instagramUrl || null,
    tiktok_url: data.tiktokUrl || null,
    updated_at: new Date().toISOString(),
  };
  
  // Update professional profile
  const { error: profileError } = await supabase
    .from('professional_profiles')
    .update(profileUpdate)
    .eq('user_id', userId);
  
  if (profileError) throw new Error(`Profile update error: ${profileError.message}`);
  
  // Update user info
  const userUpdate: Partial<Database['public']['Tables']['users']['Update']> = {
    first_name: data.firstName,
    last_name: data.lastName,
    updated_at: new Date().toISOString(),
  };
  
  const { error: userError } = await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', userId);
  
  if (userError) throw new Error(`User update error: ${userError.message}`);
}

export async function toggleProfilePublishStatusInDb(userId: string, isPublished: boolean): Promise<void> {
  const supabase = await createClient();
  
  const profileUpdate: Partial<Database['public']['Tables']['professional_profiles']['Update']> = {
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };
  
  const { error } = await supabase
    .from('professional_profiles')
    .update(profileUpdate)
    .eq('user_id', userId);
  
  if (error) throw new Error(`Profile publish status update error: ${error.message}`);
}

export async function updateSubscriptionStatusInDb(userId: string): Promise<void> {
  // This would be implemented with actual subscription logic
  // For now, we'll just simulate a successful operation
  console.log(`Subscription updated for user ${userId}`);
} 