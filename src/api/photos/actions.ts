'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Database } from '../../../supabase/types';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export type UpdateProfilePhotoResult = {
  success: boolean;
  error?: string;
  // Removed newUrl and filePath from return, client will refetch signed URL
};

/**
 * Server action to upload/update a user's profile photo.
 */
export async function updateProfilePhotoAction(
  userId: string,
  formData: FormData,
): Promise<UpdateProfilePhotoResult> {
  const file = formData.get('file') as File;

  if (!file || !(file instanceof File)) {
    return { success: false, error: 'No file provided or invalid file type.' };
  }

  // Server-side validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.` };
  }

  const supabase = await createClient();

  // --- 1. Fetch existing photo filename (if any) ---
  let oldFilePath: string | null = null;
  let recordExists = false;
  try {
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('profile_photos')
      .select('filename')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing profile photo:', fetchError);
    } else if (existingPhoto && existingPhoto.filename) {
        oldFilePath = `${userId}/${existingPhoto.filename}`;
        recordExists = true;
    }
  } catch(e) {
    console.error('Error fetching existing photo:', e)
  }

  // --- 2. Upload new photo to Storage ---
  const fileExt = file.name.split('.').pop();
  const newFileName = `profile_${Date.now()}.${fileExt}`;
  const newFilePath = `${userId}/${newFileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(newFilePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading new profile photo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // --- 3. Remove Public URL Fetching (No longer needed here) ---

    // --- 4. Update or Insert Database Record with FILENAME ---
    let dbError: { message: string } | null = null;
    const photoData = {
        user_id: userId,
        // Removed url field
        filename: newFileName,
        updated_at: new Date().toISOString(),
    };
    const insertData = { ...photoData, created_at: new Date().toISOString() }; // Add created_at for insert

    if (recordExists) {
      // UPDATE existing record
      const { error } = await supabase
        .from('profile_photos')
        .update(photoData) // Only includes fields to update
        .eq('user_id', userId);
      dbError = error;
    } else {
      // INSERT new record
      const { error } = await supabase
        .from('profile_photos')
        .insert(insertData as Database['public']['Tables']['profile_photos']['Insert']); // Use full insert data
      dbError = error;
    }


    if (dbError) {
        console.error('Error saving profile_photos record:', dbError);
        await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([newFilePath]);
        return { success: false, error: dbError.message };
    }

    // --- 5. Delete old photo from Storage (if necessary and different) ---
    if (oldFilePath && oldFilePath !== newFilePath) {
      const { error: removeError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([oldFilePath]);
      if (removeError) {
        // console.warn('Error deleting old profile photo from storage:', removeError);
      }
    }

    // --- 6. Revalidate and return success ---
    revalidatePath('/profile');
    return { success: true }; // No need to return URL/filePath

  } catch (error) {
    console.error('Server error updating profile photo:', error);
     await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([newFilePath]).catch(e => console.error("Cleanup failed", e));
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Server error updating profile photo',
    };
  }
} 