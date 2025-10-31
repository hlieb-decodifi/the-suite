'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';

// Define response type for better type safety
type ServiceResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  professional_profile: {
    id: string;
    location: string | null;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo: {
        url: string;
      } | null;
    };
  };
};

/**
 * Fetches additional services for a professional profile
 */
async function fetchAdditionalServices(
  profileId: string,
  excludeServiceId: string,
): Promise<ServiceListItem[]> {
  if (!profileId) return [];

  try {
    const supabase = createClient();

    // Fetch all services for this professional profile except the current one
    const { data, error } = await supabase
      .from('services')
      .select(
        `
        id, 
        name, 
        description, 
        duration,
        price,
        professional_profile:professional_profile_id(
          id,
          location,
          user:user_id(
            id,
            first_name,
            last_name,
            profile_photo:profile_photos(
              url
            )
          )
        )
      `,
      )
      .eq('professional_profile_id', profileId)
      .neq('id', excludeServiceId); // Exclude the current service

    if (error) {
      console.error('Error fetching additional services:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the services data to match our ServiceListItem type
    return (data as unknown as ServiceResponse[]).map((service) => {
      const professionalProfile = service.professional_profile;
      const user = professionalProfile?.user;
      const profilePhoto = user?.profile_photo?.url;

      return {
        id: service.id,
        name: service.name,
        description: service.description || '',
        price: service.price,
        duration: service.duration,
        isBookable: true, // TODO: Replace with dynamic subscription check
        professional: {
          id: user?.id || 'unknown',
          name: user
            ? `${user.first_name} ${user.last_name}`
            : 'Unknown Professional',
          avatar: profilePhoto ?? '',
          address: professionalProfile?.location || 'Location not specified',
          rating: 0,
          reviewCount: 0,
          profile_id: professionalProfile?.id,
          hide_full_address: false,
          address_data: null,
        },
      };
    });
  } catch (error) {
    console.error('Unexpected error in fetchAdditionalServices:', error);
    return [];
  }
}

/**
 * Hook for fetching additional services using React Query
 */
export function useAdditionalServices(
  profileId: string,
  excludeServiceId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['additionalServices', profileId, excludeServiceId],
    queryFn: () => fetchAdditionalServices(profileId, excludeServiceId),
    enabled: Boolean(profileId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
