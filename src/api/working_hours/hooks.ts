import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { getWorkingHours, updateWorkingHours } from './api';
import { WorkingHoursEntry } from '@/types/working_hours';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  workingHours: (userId: string) => ['workingHours', userId],
};

/**
 * Hook to fetch working hours
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
 * Hook to update working hours
 */
export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      hours 
    }: { 
      userId: string; 
      hours: WorkingHoursEntry[];
    }) => {
      return updateWorkingHours(userId, hours);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workingHours(userId) });
      toast({ description: 'Working hours updated successfully.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving working hours',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
  });
} 