'use client';

import { useQuery } from '@tanstack/react-query';
import { getAvailableDates } from '../actions';

/**
 * Hook for getting available dates based on professional's working hours
 * Now includes timezone context for proper conversion
 */
export function useAvailableDates(
  professionalProfileId: string,
  professionalTimezone: string = 'UTC',
  clientTimezone: string = 'UTC',
  enabled = true
) {
  return useQuery({
    queryKey: ['availableDates', professionalProfileId, professionalTimezone, clientTimezone],
    queryFn: () => getAvailableDates(professionalProfileId, professionalTimezone, clientTimezone),
    enabled: Boolean(professionalProfileId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 