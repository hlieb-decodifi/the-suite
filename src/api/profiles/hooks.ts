import { toast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProfile,
  toggleProfilePublishStatus,
  updateProfileHeader,
  updateSubscriptionStatus,
  setCookieConsent,
} from './api';
import type { HeaderFormValues, ProfileData } from '@/types/profiles';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  profile: (userId: string) => ['profile', userId],
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.profile(userId),
    queryFn: () => getProfile(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

export function useUpdateProfileHeader() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: HeaderFormValues;
    }) => {
      return updateProfileHeader(userId, data);
    },
    onSuccess: async (_, { userId }) => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
      toast({ description: 'Profile information updated successfully.' });

      // Refresh session and update auth store
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.refreshSession();
        if (sessionError) {
          console.error('Error refreshing session:', sessionError);
        } else if (sessionData.session) {
          setSession(sessionData.session);
        }
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving profile',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    },
  });
}

export function useToggleProfilePublishStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      isPublished,
    }: {
      userId: string;
      isPublished: boolean;
    }) => toggleProfilePublishStatus(userId, isPublished),
    onMutate: async ({ userId, isPublished }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile(userId) });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<ProfileData>(
        QUERY_KEYS.profile(userId),
      );

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData<ProfileData>(QUERY_KEYS.profile(userId), {
          ...previousProfile,
          isPublished,
        });
      }

      return { previousProfile };
    },
    onError: (err, { userId }, context) => {
      // If the mutation fails, roll back
      if (context?.previousProfile) {
        queryClient.setQueryData(
          QUERY_KEYS.profile(userId),
          context.previousProfile,
        );
      }

      toast({
        variant: 'destructive',
        title: 'Error toggling profile publish status',
        description:
          err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    },
    onSuccess: (_, { isPublished }) => {
      toast({
        description: `Profile ${isPublished ? 'published' : 'unpublished'} successfully.`,
      });
    },
    onSettled: (_, __, { userId }) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => updateSubscriptionStatus(userId),
    onMutate: async (userId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile(userId) });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<ProfileData>(
        QUERY_KEYS.profile(userId),
      );

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData<ProfileData>(QUERY_KEYS.profile(userId), {
          ...previousProfile,
          isSubscribed: false,
        });
      }

      return { previousProfile };
    },
    onError: (err, userId, context) => {
      // If the mutation fails, roll back
      if (context?.previousProfile) {
        queryClient.setQueryData(
          QUERY_KEYS.profile(userId),
          context.previousProfile,
        );
      }

      toast({
        variant: 'destructive',
        title: 'Error updating subscription',
        description:
          err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    },
    onSuccess: () => {
      toast({ description: 'Subscription updated successfully.' });
    },
    onSettled: (_, __, userId) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
    },
  });
}

export function useSetCookieConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      consent,
    }: {
      userId: string;
      consent: boolean;
    }) => {
      return setCookieConsent(userId, consent);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error updating cookie consent',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    },
  });
}
