'use server';

import { createClient } from '@/lib/supabase/server';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';

// Supabase project URL from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Creates a properly formatted public URL for Supabase storage
 */
function getPublicImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // Make sure the supabaseUrl is available
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not defined');
    return undefined;
  }
  
  // Construct the storage URL
  const bucketName = 'profile-photos';
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
}

/**
 * Fetches a single service with all necessary booking information
 */
export async function getServiceForBooking(serviceId: string): Promise<ServiceListItem | null> {
  const supabase = await createClient();
  
  try {
    const { data: service, error } = await supabase
      .from('services')
      .select(`
        id, 
        name, 
        description, 
        duration,
        price,
        professional_profile:professional_profile_id(
          id,
          location,
          is_subscribed,
          is_published,
          working_hours,
          timezone,
          user:user_id(
            id,
            first_name,
            last_name,
            profile_photo:profile_photos(
              url
            )
          )
        )
      `)
      .eq('id', serviceId)
      .single();

    if (error || !service) {
      console.error('Error fetching service:', error);
      return null;
    }

    // Handle the nested relationship structure
    const professionalProfile = Array.isArray(service.professional_profile) 
      ? service.professional_profile[0] 
      : service.professional_profile;
    const user = Array.isArray(professionalProfile?.user) 
      ? professionalProfile.user[0] 
      : professionalProfile?.user;
    
    // Check if service is bookable
    if (!professionalProfile?.is_published) {
      return null;
    }

    // Handle profile_photo structure safely - it might not exist
    let profilePhotoUrl: string | undefined = undefined;
    if (user?.profile_photo) {
      const profilePhotoData = Array.isArray(user.profile_photo) 
        ? user.profile_photo[0] 
        : user.profile_photo;
      const rawPhotoUrl = profilePhotoData?.url;
      profilePhotoUrl = getPublicImageUrl(rawPhotoUrl);
    }
    
    // Create professional object
    const professional = {
      id: user?.id || 'unknown',
      name: user ? `${user.first_name} ${user.last_name}` : 'Unknown Professional',
      avatar: profilePhotoUrl, // Will be undefined if no photo exists
      address: professionalProfile?.location || 'Location not specified',
      rating: 4.5, // Mock data, would come from reviews table
      reviewCount: 0, // Mock data, would come from reviews count
      profile_id: professionalProfile?.id,
      hide_full_address: false, // Default value for legacy data
      address_data: null, // No address data in this context
    };

    // Return mapped service data
    return {
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
      isBookable: true,
      professional,
    };
  } catch (error) {
    console.error('Error in getServiceForBooking:', error);
    return null;
  }
} 