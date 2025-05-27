import { createClient } from '@/lib/supabase/server';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

/**
 * Server-side version of fetchProfilePhotoUrl that uses the server Supabase client.
 * Fetches a public URL for a user's profile photo.
 * Returns the URL string if found, otherwise null.
 * Handles errors internally and logs them.
 * @param userId - The UUID of the user.
 */
export async function fetchProfilePhotoUrlServer(
  userId: string,
): Promise<string | null> {
  try {
    const supabase = await createClient();

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

    // 3. Get a public URL (not signed) since the bucket is public
    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;

  } catch (error) {
    console.error('Unexpected error fetching profile photo URL:', error);
    return null;
  }
} 