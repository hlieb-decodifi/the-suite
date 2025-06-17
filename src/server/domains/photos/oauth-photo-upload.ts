import { createClient } from '@/lib/supabase/server';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

export type OAuthPhotoUploadResult = {
  success: boolean;
  error?: string;
  photoUrl?: string;
};

/**
 * Automatically upload a user's profile photo from OAuth provider (e.g., Google)
 * during the signup process
 */
export async function uploadOAuthProfilePhoto(
  userId: string,
  photoUrl: string,
  providerName: string = 'google'
): Promise<OAuthPhotoUploadResult> {
  try {
    if (!photoUrl) {
      return { success: false, error: 'No photo URL provided' };
    }

    const supabase = await createClient();

    // Check if user already has a profile photo
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('profile_photos')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing profile photo:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // If user already has a photo, don't override it
    if (existingPhoto) {
      return { success: true, error: 'User already has a profile photo' };
    }

    // Download the image from the OAuth provider
    const response = await fetch(photoUrl);
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch photo from OAuth provider' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], `${providerName}_profile_photo.jpg`, {
      type: 'image/jpeg',
    });

    // Generate filename
    const timestamp = Date.now();
    const fileName = `oauth_${providerName}_${timestamp}.jpg`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading OAuth profile photo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      // Cleanup uploaded file if we can't get URL
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([filePath]);
      return { success: false, error: 'Could not get public URL for the uploaded photo' };
    }

    // Save to database
    const { error: dbError } = await supabase
      .from('profile_photos')
      .insert({
        user_id: userId,
        url: urlData.publicUrl,
        filename: fileName,
      });

    if (dbError) {
      console.error('Error saving OAuth profile photo to database:', dbError);
      // Cleanup uploaded file
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([filePath]);
      return { success: false, error: dbError.message };
    }

    return { 
      success: true, 
      photoUrl: urlData.publicUrl 
    };

  } catch (error) {
    console.error('Unexpected error uploading OAuth profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
} 