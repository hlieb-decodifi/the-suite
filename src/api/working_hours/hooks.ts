import { useQuery } from '@tanstack/react-query';
import { getWorkingHoursAction } from './actions';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  workingHours: (userId: string) => ['workingHours', userId],
};

export function useWorkingHours(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workingHours(userId),
    queryFn: async () => {
      const result = await getWorkingHoursAction(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch working hours');
      }
      return result.hours;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
} 