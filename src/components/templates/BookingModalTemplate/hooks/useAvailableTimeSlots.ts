'use client';

import { useQuery } from '@tanstack/react-query';
import { getAvailableTimeSlots } from '../actions';

/**
 * Hook for fetching available time slots using React Query
 * Now includes timezone context for proper conversion
 */
export function useAvailableTimeSlots(
  professionalProfileId: string,
  date: string | null,
  requiredDurationMinutes: number = 30,
  professionalTimezone: string = 'UTC',
  clientTimezone: string = 'UTC',
  enabled = true,
) {
  const query = useQuery({
    queryKey: [
      'availableTimeSlots',
      professionalProfileId,
      date,
      requiredDurationMinutes,
      professionalTimezone,
      clientTimezone,
    ],
    queryFn: async () => {
      console.log('Fetching time slots with params:', {
        professionalProfileId,
        date,
        requiredDurationMinutes,
        professionalTimezone,
        clientTimezone,
      });

      if (!date) {
        console.log('No date provided, returning empty array');
        return [];
      }

      const slots = await getAvailableTimeSlots(
        professionalProfileId,
        date,
        requiredDurationMinutes,
        professionalTimezone,
        clientTimezone,
      );
      console.log('Received time slots:', slots);
      return slots;
    },
    enabled: Boolean(professionalProfileId) && Boolean(date) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // console.log('useAvailableTimeSlots hook state:', {
  //   isEnabled: Boolean(professionalProfileId) && Boolean(date) && enabled,
  //   isLoading: query.isLoading,
  //   isFetching: query.isFetching,
  //   error: query.error,
  //   data: query.data
  // });

  return query;
}
