import { createClient } from '@/lib/supabase/client';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const SIGNED_URL_EXPIRATION = 60 * 60; // 1 hour in seconds

/**
 * Fetches a temporary signed URL for a user's profile photo.
 * Returns the signed URL string if found, otherwise null.
 * Handles errors internally and logs them.
 * @param userId - The UUID of the user.
 */
export async function fetchProfilePhotoUrl(
  userId: string,
): Promise<string | null> {
  try {
    const supabase = createClient();

    // 1. Fetch the filename from the database
    const { data: photoData, error: dbError } = await supabase
      .from('profile_photos')
      .select('filename')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbError) {
      console.error('Error fetching profile photo filename:', dbError);
      return null;
    }

    if (!photoData?.filename) {
      // User doesn't have a profile photo record or filename is missing
      return null;
    }

    // 2. Construct the full file path
    const filePath = `${userId}/${photoData.filename}`;

    // 3. Create a signed URL
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRATION);

    if (signError) {
      console.error('Error creating signed URL:', signError);
      return null;
    }

    return signedUrlData?.signedUrl || null;

  } catch (error) {
    console.error('Unexpected error fetching profile photo URL:', error);
    return null;
  }
} 