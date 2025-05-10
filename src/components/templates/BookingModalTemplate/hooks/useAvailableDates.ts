'use client';

import { useQuery } from '@tanstack/react-query';
import { getAvailableDates } from '../actions';

/**
 * Hook for getting available dates based on professional's working hours
 */
export function useAvailableDates(
  professionalProfileId: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['availableDates', professionalProfileId],
    queryFn: () => getAvailableDates(professionalProfileId),
    enabled: Boolean(professionalProfileId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 