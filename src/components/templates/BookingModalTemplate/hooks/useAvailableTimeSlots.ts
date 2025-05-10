'use client';

import { useQuery } from '@tanstack/react-query';
import { getAvailableTimeSlots } from '../actions';

/**
 * Hook for fetching available time slots using React Query
 */
export function useAvailableTimeSlots(
  professionalProfileId: string,
  date: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['availableTimeSlots', professionalProfileId, date],
    queryFn: async () => {
      if (!date) return [];
      return getAvailableTimeSlots(professionalProfileId, date);
    },
    enabled: Boolean(professionalProfileId) && Boolean(date) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 