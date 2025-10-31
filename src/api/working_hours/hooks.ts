import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import {
  getWorkingHours,
  updateWorkingHours,
  getProfessionalTimezone,
} from './api';
import { WorkingHoursEntry } from '@/types/working_hours';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  workingHours: (userId: string) => ['workingHours', userId],
  professionalTimezone: (userId: string) => ['professionalTimezone', userId],
};

/**
 * Hook to fetch working hours with timezone
 */
export function useWorkingHours(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workingHours(userId),
    queryFn: () => getWorkingHours(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

/**
 * Hook to fetch professional's timezone
 */
export function useProfessionalTimezone(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.professionalTimezone(userId),
    queryFn: () => getProfessionalTimezone(userId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!userId,
  });
}

/**
 * Hook to update working hours with timezone
 */
export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      hours,
      timezone,
    }: {
      userId: string;
      hours: WorkingHoursEntry[];
      timezone?: string;
    }) => {
      return updateWorkingHours(userId, hours, timezone);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workingHours(userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.professionalTimezone(userId),
      });
      toast({ description: 'Working hours updated successfully.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving working hours',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    },
  });
}
