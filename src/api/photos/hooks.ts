import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { updateProfilePhotoAction } from './actions';
import { fetchProfilePhotoUrl } from './fetchers';
import { useAuthStore } from '@/stores/authStore';

// Define query keys
export const QUERY_KEYS = {
  avatarUrl: (userId: string) => ['avatarUrl', userId],
};

export function useAvatarUrlQuery(userId?: string) {
  const setStoreAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  
  // Get current avatar URL from store for initial data
  const currentAvatarUrl = useAuthStore((state) => state.avatarUrl);

  return useQuery({
    queryKey: QUERY_KEYS.avatarUrl(userId || ''),
    queryFn: async () => {
      if (!userId) {
        return;
      }
      const url = await fetchProfilePhotoUrl(userId);
      
      // Update the store when we get a new URL
      if (url) {
        setStoreAvatarUrl(url);
      }
      
      return url;
    },
    // Use initial data from the store if available
    initialData: currentAvatarUrl || undefined,
    staleTime: Infinity, // Never consider the data stale automatically
    gcTime: Infinity, // Never remove from cache automatically
    refetchOnMount: false, // Don't refetch data when component remounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    enabled: !!userId,
  });
}

export function useUpdateProfilePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      formData 
    }: { 
      userId: string; 
      formData: FormData;
    }) => {
      const result = await updateProfilePhotoAction(userId, formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile photo');
      }
      return result;
    },
    onSuccess: (_, { userId }) => {
      // Invalidate avatar URL query to trigger refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.avatarUrl(userId) });
      toast({
        title: 'Success',
        description: 'Profile photo updated successfully!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to update profile photo',
      });
    },
  });
} 