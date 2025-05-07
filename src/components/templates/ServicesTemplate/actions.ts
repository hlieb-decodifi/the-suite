'use server';

import { createClient } from '@/lib/supabase/server';
import { ServiceListItem, Professional, PaginationInfo } from './types';

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

// Define a return type that includes pagination metadata
export type ServicesWithPagination = {
  services: ServiceListItem[];
  pagination: PaginationInfo;
};

/**
 * Get published professional profile IDs
 */
async function getPublishedProfileIds() {
  const supabase = await createClient();
  
  const { data: publishedProfiles } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('is_published', true);
  
  return publishedProfiles?.map(profile => profile.id) || [];
}

/**
 * Count total services for pagination
 */
async function countServices(publishedProfileIds: string[]) {
  const supabase = await createClient();
  
  const { count, error: countError } = await supabase
    .from('services')
    .select('id', { count: 'exact' })
    .in('professional_profile_id', publishedProfileIds);
    
  if (countError) {
    console.error('Error counting services:', countError);
    return 0;
  }
  
  return count || 0;
}

/**
 * Create empty pagination result
 */
function createEmptyPaginationResult(page: number, pageSize: number): ServicesWithPagination {
  return { 
    services: [], 
    pagination: { 
      currentPage: page, 
      totalPages: 0, 
      totalItems: 0, 
      pageSize 
    } 
  };
}

/**
 * Fetches services with professional information from Supabase with pagination
 */
/* eslint-disable-next-line max-lines-per-function */
export async function getServices(
  page = 1,
  pageSize = 12
): Promise<ServicesWithPagination> {
  const supabase = await createClient();
  
  // Get published profile IDs
  const publishedProfileIds = await getPublishedProfileIds();
  if (publishedProfileIds.length === 0) {
    return createEmptyPaginationResult(page, pageSize);
  }
  
  // Count total services for pagination
  const totalCount = await countServices(publishedProfileIds);
  if (totalCount === 0) {
    return createEmptyPaginationResult(page, pageSize);
  }
  
  // Calculate start and end for pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  
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
    .order('name')
    .range(start, end);

  if (error) {
    console.error('Error fetching services:', error);
    return createEmptyPaginationResult(page, pageSize);
  }
  
  if (!servicesData || servicesData.length === 0) {
    return { 
      services: [], 
      pagination: { 
        currentPage: page, 
        totalPages: Math.ceil(totalCount / pageSize), 
        totalItems: totalCount, 
        pageSize 
      } 
    };
  }
  
  // Transform the data to match our ServiceListItem type
  const mappedServices = servicesData.map(mapServiceData);
  
  return {
    services: mappedServices,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize),
      totalItems: totalCount,
      pageSize
    }
  };
}

/**
 * Fetches services filtered by search term and location
 */
export async function getFilteredServices(
  searchTerm?: string,
  location?: string,
  page = 1,
  pageSize = 12
): Promise<ServicesWithPagination> {
  const { services, pagination } = await getServices(page, pageSize);
  
  if (!searchTerm && !location) {
    return { services, pagination };
  }
  
  const filteredServices = services.filter((service) => {
    const searchTermMatch = !searchTerm 
      || service.name.toLowerCase().includes(searchTerm.toLowerCase())
      || service.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const locationMatch = !location
      || service.professional.address.toLowerCase().includes(location.toLowerCase());
      
    return searchTermMatch && locationMatch;
  });
  
  // Adjust pagination for filtered results
  return {
    services: filteredServices,
    pagination: {
      ...pagination,
      totalItems: filteredServices.length,
      totalPages: Math.ceil(filteredServices.length / pageSize)
    }
  };
} 