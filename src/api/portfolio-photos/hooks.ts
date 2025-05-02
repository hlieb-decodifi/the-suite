import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { 
  getPortfolioPhotos, 
  uploadPortfolioPhoto, 
  deletePortfolioPhoto,
  updatePortfolioPhoto
} from './api';

// Query keys
export const PORTFOLIO_PHOTO_KEYS = {
  all: ['portfolioPhotos'] as const,
  lists: () => [...PORTFOLIO_PHOTO_KEYS.all, 'list'] as const,
  list: (userId: string) => [...PORTFOLIO_PHOTO_KEYS.lists(), userId] as const,
  details: () => [...PORTFOLIO_PHOTO_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PORTFOLIO_PHOTO_KEYS.details(), id] as const,
};

/**
 * Hook to fetch portfolio photos for a user
 */
export function usePortfolioPhotos(userId: string) {
  return useQuery({
    queryKey: PORTFOLIO_PHOTO_KEYS.list(userId),
    queryFn: () => getPortfolioPhotos(userId),
    enabled: !!userId,
  });
}

/**
 * Hook for uploading a portfolio photo
 */
export function useUploadPortfolioPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uploadPortfolioPhoto,
    onSuccess: (newPhoto, { userId }) => {
      // Update the query cache with the new photo
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_PHOTO_KEYS.list(userId) });
      
      toast({
        title: 'Success',
        description: 'Portfolio photo uploaded successfully!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload portfolio photo',
      });
    },
  });
}

/**
 * Hook for deleting a portfolio photo
 */
export function useDeletePortfolioPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => 
      deletePortfolioPhoto(id, userId),
    onSuccess: (_, { userId }) => {
      // Invalidate the portfolio photos list
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_PHOTO_KEYS.list(userId) });
      
      toast({
        title: 'Success',
        description: 'Portfolio photo deleted successfully!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete portfolio photo',
      });
    },
  });
}

/**
 * Hook for updating a portfolio photo
 */
export function useUpdatePortfolioPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      id, 
      userId, 
      updates 
    }: { 
      id: string; 
      userId: string; 
      updates: { description?: string; orderIndex?: number } 
    }) => updatePortfolioPhoto(id, userId, updates),
    onSuccess: (updatedPhoto, { userId }) => {
      // Invalidate the portfolio photos list
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_PHOTO_KEYS.list(userId) });
      
      toast({
        title: 'Success',
        description: 'Portfolio photo updated successfully!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update portfolio photo',
      });
    },
  });
} 