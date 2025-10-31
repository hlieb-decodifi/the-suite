import { useState, useEffect } from 'react';
import { fetchProfilePhotoUrl } from '@/api/photos/fetchers';

/**
 * Custom hook to fetch the signed URL for a user's avatar.
 * Handles loading state and refetches when userId or trigger changes.
 *
 * @param userId The ID of the user whose avatar URL is needed. Can be null/undefined.
 * @param trigger A state variable that can be incremented to force a refetch.
 * @param enabled Controls whether the fetch should be executed. Defaults to true.
 * @returns An object containing the avatarUrl (string | null) and isLoading (boolean).
 */
export function useAvatarUrl(
  userId: string | null | undefined,
  trigger?: number,
  enabled: boolean = true, // Add enabled parameter with default true
) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled); // Initial loading state depends on enabled

  useEffect(() => {
    let isMounted = true;

    // Only proceed if the hook is enabled
    if (!enabled) {
      setAvatarUrl(null);
      setIsLoading(false);
      return; // Exit early if not enabled
    }

    setIsLoading(true); // Set loading true at the start of the effect (if enabled)

    async function loadAvatar() {
      if (!userId) {
        // If no userId (and enabled), clear URL and stop loading
        if (isMounted) {
          setAvatarUrl(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const url = await fetchProfilePhotoUrl(userId);
        if (isMounted) {
          setAvatarUrl(url);
        }
      } catch (error) {
        // Handle potential errors during fetch (optional: log or set error state)
        console.error('Failed to fetch avatar URL:', error);
        if (isMounted) {
          setAvatarUrl(null); // Clear URL on error
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // Stop loading after fetch completes or fails
        }
      }
    }

    loadAvatar();

    return () => {
      isMounted = false;
    };
    // Depend on userId, trigger, and enabled
  }, [userId, trigger, enabled]);

  return { avatarUrl, isLoading };
}
