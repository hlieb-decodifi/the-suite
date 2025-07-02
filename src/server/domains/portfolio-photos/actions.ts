'use server';

import { createClient } from '@/lib/supabase/server';
import { PortfolioPhotoDB, PortfolioPhotoResponse, PortfolioPhotoUI, PortfolioPhotosResponse } from '@/types/portfolio-photos';
import {
  countPortfolioPhotos,
  deletePortfolioPhoto as deletePhotoFromDb,
  getPortfolioPhotoById,
  getPortfolioPhotosForUser,
  updatePortfolioPhoto as updatePhotoInDb
} from './db';

// Transform DB model to UI model
function transformToUI(dbPhoto: PortfolioPhotoDB): PortfolioPhotoUI {
  return {
    id: dbPhoto.id,
    url: dbPhoto.url,
    description: dbPhoto.description,
    orderIndex: dbPhoto.order_index
  };
}

/**
 * Get all portfolio photos for a user
 */
export async function getPortfolioPhotos(
  userId: string
): Promise<PortfolioPhotosResponse> {
  try {
    const photos = await getPortfolioPhotosForUser(userId);
    return {
      success: true,
      photos: photos.map(transformToUI)
    };
  } catch (error) {
    console.error('Error in getPortfolioPhotos action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get a single portfolio photo by ID
 */
export async function getPortfolioPhoto(
  id: string
): Promise<PortfolioPhotoResponse> {
  try {
    const photo = await getPortfolioPhotoById(id);
    if (!photo) {
      return {
        success: false,
        error: 'Photo not found'
      };
    }
    
    return {
      success: true,
      photo: transformToUI(photo)
    };
  } catch (error) {
    console.error('Error in getPortfolioPhoto action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Upload a portfolio photo
 */
export async function uploadPortfolioPhoto(
  userId: string,
  formData: FormData
): Promise<PortfolioPhotoResponse> {
  try {
    // Get the max photos limit
    const { maxPhotos = 20 } = await getMaxPortfolioPhotosAction();

    // Check if the user is at the photo limit
    const count = await countPortfolioPhotos(userId);
    if (count >= maxPhotos) {
      return {
        success: false,
        error: `You have reached the maximum limit of ${maxPhotos} portfolio photos`
      };
    }

    // Get description from formData if provided
    const description = formData.get('description') as string || null;
    
    // Get the file from formData
    const file = formData.get('file') as File;
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return {
        success: false,
        error: 'Only image files are allowed'
      };
    }

    return await processPhotoUpload(userId, file, description, count);
  } catch (error) {
    console.error('Error in uploadPortfolioPhoto action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper function to process photo upload - splits the function to reduce line count
async function processPhotoUpload(
  userId: string, 
  file: File, 
  description: string | null, 
  orderIndex: number
): Promise<PortfolioPhotoResponse> {
  // Generate a unique filename
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${timestamp}.${fileExtension}`;
  
  // Upload to Supabase Storage
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from('portfolio-photos')
    .upload(`${userId}/${filename}`, file);

  if (uploadError) {
    console.error('Error uploading file to storage:', uploadError);
    return {
      success: false,
      error: uploadError.message
    };
  }

  // Generate a signed URL
  const { data: urlData } = await supabase.storage
    .from('portfolio-photos')
    .createSignedUrl(`${userId}/${filename}`, 60 * 60 * 24 * 365); // 1 year

  if (!urlData?.signedUrl) {
    return {
      success: false,
      error: 'Failed to generate signed URL'
    };
  }

  // Save to database
  const { data: photoData, error: dbError } = await supabase
    .from('portfolio_photos')
    .insert({
      user_id: userId,
      filename: filename,
      url: urlData.signedUrl,
      description: description,
      order_index: orderIndex // Use current count as order index (0-based)
    })
    .select('*')
    .single();

  if (dbError) {
    console.error('Error saving photo to database:', dbError);
    return {
      success: false,
      error: dbError.message
    };
  }

  return {
    success: true,
    photo: transformToUI(photoData)
  };
}

/**
 * Delete a portfolio photo
 */
export async function deletePortfolioPhoto(
  id: string,
  userId: string
): Promise<PortfolioPhotoResponse> {
  try {
    // First get the photo to get the filename
    const supabase = await createClient();
    const { data: photo, error: fetchError } = await supabase
      .from('portfolio_photos')
      .select('filename')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
      
    if (fetchError || !photo) {
      return {
        success: false,
        error: 'Photo not found or you do not have permission to delete it'
      };
    }
    
    // Delete from database
    await deletePhotoFromDb(id, userId);
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('portfolio-photos')
      .remove([`${userId}/${photo.filename}`]);
      
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue anyway since the database record is deleted
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error in deletePortfolioPhoto action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update a portfolio photo's description or order
 */
export async function updatePortfolioPhoto(
  id: string,
  userId: string,
  updates: { description?: string; orderIndex?: number }
): Promise<PortfolioPhotoResponse> {
  try {
    // Create update object with correct types
    const dbUpdates: { description?: string | null; order_index?: number } = {};
    
    // Only add properties that exist
    if (updates.description !== undefined) {
      dbUpdates.description = updates.description ?? null;
    }
    
    if (updates.orderIndex !== undefined) {
      dbUpdates.order_index = updates.orderIndex;
    }
    
    // Update in database
    const updatedPhoto = await updatePhotoInDb(id, userId, dbUpdates);
    
    return {
      success: true,
      photo: transformToUI(updatedPhoto)
    };
  } catch (error) {
    console.error('Error in updatePortfolioPhoto action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get the maximum number of portfolio photos allowed per professional
 */
export async function getMaxPortfolioPhotosAction(): Promise<{
  success: boolean;
  maxPhotos?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data } = await supabase.rpc('get_admin_config', {
      config_key: 'max_portfolio_photos',
      default_value: '20'
    });
    
    const maxPhotos = parseInt(data || '20');
    
    return {
      success: true,
      maxPhotos
    };
  } catch (error) {
    console.error('Error getting max portfolio photos:', error);
    return {
      success: false,
      error: 'Failed to get max portfolio photos limit',
      maxPhotos: 20 // Default fallback
    };
  }
} 