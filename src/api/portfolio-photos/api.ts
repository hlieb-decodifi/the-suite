import { 
  getPortfolioPhotos as getPhotosAction,
  uploadPortfolioPhoto as uploadPhotoAction,
  deletePortfolioPhoto as deletePhotoAction,
  updatePortfolioPhoto as updatePhotoAction
} from '@/server/domains/portfolio-photos/actions';
import { PortfolioPhotoUI, UploadPortfolioPhotoParams } from '@/types/portfolio-photos';

/**
 * Get all portfolio photos for a user
 */
export async function getPortfolioPhotos(userId: string): Promise<PortfolioPhotoUI[]> {
  const result = await getPhotosAction(userId);
  if (!result.success) throw new Error(result.error);
  return result.photos || [];
}

/**
 * Upload a new portfolio photo
 */
export async function uploadPortfolioPhoto(
  params: UploadPortfolioPhotoParams
): Promise<PortfolioPhotoUI> {
  const { userId, formData } = params;
  
  // Add description to formData if provided
  if (params.description) {
    formData.append('description', params.description);
  }
  
  const result = await uploadPhotoAction(userId, formData);
  if (!result.success) throw new Error(result.error);
  if (!result.photo) throw new Error('Failed to upload photo');
  
  return result.photo;
}

/**
 * Delete a portfolio photo
 */
export async function deletePortfolioPhoto(id: string, userId: string): Promise<void> {
  const result = await deletePhotoAction(id, userId);
  if (!result.success) throw new Error(result.error);
}

/**
 * Update a portfolio photo's description or order
 */
export async function updatePortfolioPhoto(
  id: string,
  userId: string,
  updates: { description?: string; orderIndex?: number }
): Promise<PortfolioPhotoUI> {
  const result = await updatePhotoAction(id, userId, updates);
  if (!result.success) throw new Error(result.error);
  if (!result.photo) throw new Error('Failed to update photo');
  
  return result.photo;
} 