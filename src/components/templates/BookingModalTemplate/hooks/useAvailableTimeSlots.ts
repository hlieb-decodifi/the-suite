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
  professionalTimezone: string = 'UTC',
  clientTimezone: string = 'UTC',
  enabled = true
) {
  return useQuery({
    queryKey: ['availableTimeSlots', professionalProfileId, date, professionalTimezone, clientTimezone],
    queryFn: async () => {
      if (!date) return [];
      return getAvailableTimeSlots(professionalProfileId, date, professionalTimezone, clientTimezone);
    },
    enabled: Boolean(professionalProfileId) && Boolean(date) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 