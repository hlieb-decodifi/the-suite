// Type guard for PostgREST not found error
function isPostgrestNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const err = error as { code?: string; message?: string; status?: number };
  const isPGRST116 = err.code === 'PGRST116' && typeof err.message === 'string' && err.message.includes('no rows returned');
  return isPGRST116;
}


import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { getClientProfileWithAddress } from '@/api/profiles/fetchers';
import { useProfessionalProfileWithAddress } from '@/api/profiles/queriesProfessional';



// Custom hook for browser geolocation
export function useBrowserGeolocation() {
  const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoTried, setGeoTried] = useState(false);
  useEffect(() => {
    if (!geoLocation && !geoTried) {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setGeoTried(true);
          },
          () => setGeoTried(true),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else {
        setGeoTried(true);
      }
    }
  }, [geoLocation, geoTried]);

  return geoLocation;
}



export function useUserDefaultLocation() {
  // Get the current user from auth store's getUser method
  const getUser = useAuthStore((state) => state.getUser);
  const userId = getUser()?.id;

  // Always call the browser geolocation hook
  const geoLocation = useBrowserGeolocation();

  // Always call the queries, but only enable if userId exists
  const { data } = useQuery({
    queryKey: ['clientProfileWithAddress', userId],
    queryFn: async () => {
      try {
        return await getClientProfileWithAddress(userId!);
      } catch (err: unknown) {
        if (isPostgrestNotFoundError(err)) {
          return { address: null };
        }
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Use the professional profile hook directly
  const { data: profData } = useProfessionalProfileWithAddress(userId);

  // Try to get latitude/longitude from client profile address
  const address = data?.address;
  if (
    address &&
    typeof address.latitude === 'number' &&
    typeof address.longitude === 'number'
  ) {
    return { latitude: address.latitude, longitude: address.longitude };
  }

  // Fallback: Try professional profile address
  const profAddress = profData?.address;
  if (
    profAddress &&
    typeof profAddress.latitude === 'number' &&
    typeof profAddress.longitude === 'number'
  ) {
    return { latitude: profAddress.latitude, longitude: profAddress.longitude };
  }

  // Final fallback: use browser geolocation
  if (geoLocation) {
    return geoLocation;
  }

  return null;
}
