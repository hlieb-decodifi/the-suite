'use server';

import { createClient } from '@/lib/supabase/server';
import { ServiceListItem, Professional } from './types';

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
  // Format: {SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{PATH}
  const bucketName = 'profile-photos';
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
}

/**
 * Maps raw service data to the ServiceListItem type
 */
function mapServiceData(service: unknown): ServiceListItem {
  // Safely type cast the service object
  const serviceData = service as {
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    professional_profile: {
      id: string;
      location: string | null;
      is_subscribed: boolean;
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

  const professionalProfile = serviceData.professional_profile;
  const user = professionalProfile?.user;
  const rawPhotoUrl = user?.profile_photo?.url;
  
  // Generate proper public URL for the avatar
  const profilePhoto = getPublicImageUrl(rawPhotoUrl);
  
  // Create professional object
  const professional: Professional = {
    id: user?.id || 'unknown',
    name: user ? `${user.first_name} ${user.last_name}` : 'Unknown Professional',
    avatar: profilePhoto,
    address: professionalProfile?.location || 'Location not specified',
    rating: 4.5, // Mock data, would come from reviews table
    reviewCount: 0, // Mock data, would come from reviews count
  };

  // Return mapped service data
  return {
    id: serviceData.id,
    name: serviceData.name,
    description: serviceData.description || '',
    price: serviceData.price,
    duration: serviceData.duration,
    isBookable: professionalProfile?.is_subscribed === true,
    professional,
  };
}

/**
 * Fetches all services with professional information from Supabase
 */
export async function getServices(): Promise<ServiceListItem[]> {
  const supabase = await createClient();
  
  // First get published profile IDs
  const { data: publishedProfiles } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('is_published', true);
  
  // Extract just the IDs into an array
  const publishedProfileIds = publishedProfiles?.map(profile => profile.id) || [];
  
  // Use the array with in() for better performance than filter()
  const { data: servicesData, error } = await supabase
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
    .in('professional_profile_id', publishedProfileIds)
    .order('name');

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }
  
  if (!servicesData || servicesData.length === 0) {
    return [];
  }
  
  // Transform the data to match our ServiceListItem type
  return servicesData.map(mapServiceData);
}

/**
 * Fetches services filtered by search term and location
 */
export async function getFilteredServices(
  searchTerm?: string,
  location?: string
): Promise<ServiceListItem[]> {
  const services = await getServices();
  
  if (!searchTerm && !location) {
    return services;
  }
  
  return services.filter((service) => {
    const searchTermMatch = !searchTerm 
      || service.name.toLowerCase().includes(searchTerm.toLowerCase())
      || service.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const locationMatch = !location
      || service.professional.address.toLowerCase().includes(location.toLowerCase());
      
    return searchTermMatch && locationMatch;
  });
} 