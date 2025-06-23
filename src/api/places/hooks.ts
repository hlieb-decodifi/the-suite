'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  AddressData,
} from './types';
import {
  autocompleteAddresses,
  getPlaceDetails,
  searchPlacesByText,
  searchPlacesNearby,
  generateSessionToken,
} from './api';

// Query keys
export const placesKeys = {
  all: ['places'] as const,
  autocomplete: (input: string, options?: object) => 
    [...placesKeys.all, 'autocomplete', input, options] as const,
  details: (placeId: string, options?: object) => 
    [...placesKeys.all, 'details', placeId, options] as const,
  textSearch: (query: string, options?: object) => 
    [...placesKeys.all, 'textSearch', query, options] as const,
  nearbySearch: (center: { latitude: number; longitude: number }, radius: number, options?: object) => 
    [...placesKeys.all, 'nearbySearch', center, radius, options] as const,
} as const;

type UseAddressAutocompleteOptions = {
  enabled?: boolean;
  debounceMs?: number;
  sessionToken?: string;
  bias?: { latitude: number; longitude: number; radius?: number };
  restriction?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  countries?: string[];
  language?: string;
  region?: string;
  onSelect?: (placeId: string) => void;
}

/**
 * Hook for address autocomplete with session token management
 * Optimized for address input with debouncing and session billing optimization
 */
export function useAddressAutocomplete(
  input: string,
  options: UseAddressAutocompleteOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 300,
    sessionToken: providedToken,
    ...apiOptions
  } = options;

  // Generate session token for this autocomplete session
  const sessionTokenRef = useRef<string | null>(null);
  const sessionToken = useMemo(() => {
    if (providedToken) return providedToken;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
    return sessionTokenRef.current;
  }, [providedToken]);

  // Debounce input to avoid excessive API calls
  const debouncedInput = useDebounce(input, debounceMs);

  // Query for autocomplete results
  const query = useQuery({
    queryKey: placesKeys.autocomplete(debouncedInput, { ...apiOptions, sessionToken }),
    queryFn: () => autocompleteAddresses(debouncedInput, { ...apiOptions, sessionToken }),
    enabled: enabled && debouncedInput.length > 2, // Only search if input is meaningful
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Function to reset session token (call when user makes a selection)
  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  return {
    ...query,
    sessionToken,
    resetSession,
    suggestions: query.data?.suggestions || [],
  };
}

type UseAddressDetailsOptions = {
  sessionToken?: string;
  language?: string;
  region?: string;
}

/**
 * Hook for getting full address details when user selects an autocomplete result
 */
export function useAddressDetails(options: UseAddressDetailsOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeId: string) => {
      return getPlaceDetails(placeId, options);
    },
    onSuccess: (data) => {
      // Cache the result for potential future use
      queryClient.setQueryData(
        placesKeys.details(data.google_place_id, options),
        data
      );
    },
  });
}

type UseAddressSearchOptions = {
  bias?: { latitude: number; longitude: number; radius?: number };
  restriction?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  maxResults?: number;
  language?: string;
  region?: string;
  openNow?: boolean;
  priceLevel?: 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
}

/**
 * Hook for text-based place search
 */
export function useAddressSearch(
  query: string,
  options: UseAddressSearchOptions & { enabled?: boolean; debounceMs?: number } = {}
) {
  const { enabled = true, debounceMs = 500, ...apiOptions } = options;
  
  const debouncedQuery = useDebounce(query, debounceMs);

  return useQuery({
    queryKey: placesKeys.textSearch(debouncedQuery, apiOptions),
    queryFn: () => searchPlacesByText(debouncedQuery, apiOptions),
    enabled: enabled && debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

type UseNearbyPlacesOptions = {
  includedTypes?: string[];
  excludedTypes?: string[];
  maxResults?: number;
  language?: string;
  region?: string;
  rankBy?: 'POPULARITY' | 'DISTANCE';
  enabled?: boolean;
}

/**
 * Hook for finding places near a location
 */
export function useNearbyPlaces(
  center: { latitude: number; longitude: number },
  radius: number,
  options: UseNearbyPlacesOptions = {}
) {
  const { enabled = true, ...apiOptions } = options;

  return useQuery({
    queryKey: placesKeys.nearbySearch(center, radius, apiOptions),
    queryFn: () => searchPlacesNearby(center, radius, apiOptions),
    enabled: enabled && !!center.latitude && !!center.longitude,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook that combines autocomplete and place details selection
 * This provides a complete address selection flow
 */
export function useAddressSelector(options: UseAddressAutocompleteOptions = {}) {
  const [input, setInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  
  // Autocomplete hook
  const autocomplete = useAddressAutocomplete(input, {
    ...options,
    ...(options.onSelect && { onSelect: options.onSelect }),
  });

  // Place details hook
  const placeDetails = useAddressDetails({
    sessionToken: autocomplete.sessionToken,
    ...(options.language && { language: options.language }),
    ...(options.region && { region: options.region }),
  });

  // Handle address selection
  const selectAddress = useCallback(async (placeId: string) => {
    try {
      const addressData = await placeDetails.mutateAsync(placeId);
      setSelectedAddress(addressData);
      autocomplete.resetSession();
      
      // Call custom onSelect callback if provided
      if (options.onSelect) {
        options.onSelect(placeId);
      }
      
      return addressData;
    } catch (error) {
      console.error('Error selecting address:', error);
      throw error;
    }
  }, [placeDetails, autocomplete, options.onSelect]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedAddress(null);
    setInput('');
    autocomplete.resetSession();
  }, [autocomplete]);

  return {
    input,
    setInput,
    selectedAddress,
    setSelectedAddress,
    autocomplete,
    placeDetails,
    selectAddress,
    clearSelection,
    isLoading: autocomplete.isLoading || placeDetails.isPending,
    error: autocomplete.error || placeDetails.error,
  };
}

// Additional hook for getting user's current location (requires geolocation permission)
export function useCurrentLocation() {
  return useQuery({
    queryKey: ['geolocation', 'current'],
    queryFn: () => new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 