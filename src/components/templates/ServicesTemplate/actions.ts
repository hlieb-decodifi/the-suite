'use server';

import { createClient } from '@/lib/supabase/server';
import { ServiceListItem, Professional, PaginationInfo } from './types';
import { getProfessionalRatingStats, shouldShowPublicReviews } from '@/api/reviews/api';

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
 * Maps raw service data to the ServiceListItem type
 */
async function mapServiceData(service: unknown): Promise<ServiceListItem> {
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
      hide_full_address: boolean;
      address: {
        id: string;
        country: string;
        state: string;
        city: string;
        street_address: string;
        apartment: string;
        latitude: number;
        longitude: number;
      } | null;
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
  
  // Get real review data for professional
  let rating = 0;
  let reviewCount = 0;
  try {
    const ratingStats = await getProfessionalRatingStats(user?.id || '');
    const shouldShow = await shouldShowPublicReviews(user?.id || '');
    
    if (shouldShow && ratingStats) {
      rating = ratingStats.averageRating;
      reviewCount = ratingStats.totalReviews;
    }
  } catch (error) {
    console.error('Error fetching review stats for professional:', user?.id, error);
  }
  
  // Format address for display based on privacy settings
  const address = professionalProfile?.address;
  const hideFullAddress = professionalProfile?.hide_full_address || false;
  const displayAddress = address
    ? hideFullAddress
      ? `${address.city}, ${address.state}, ${address.country}`
        .replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '')
        .trim()
      : `${address.street_address}${address.apartment ? `, ${address.apartment}` : ''}, ${address.city}, ${address.state}, ${address.country}`
        .replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '')
        .trim()
    : professionalProfile?.location || 'Location not specified'; // Fallback to legacy location field
  
  // Create professional object
  const professional: Professional = {
    id: user?.id || 'unknown',
    name: user ? `${user.first_name} ${user.last_name}` : 'Unknown Professional',
    avatar: profilePhoto,
    address: displayAddress,
    rating,
    reviewCount,
    profile_id: professionalProfile?.id, // Include the professional profile ID
    hide_full_address: hideFullAddress,
    address_data: address,
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
export async function getServices(
  page = 1,
  pageSize = 12,
  search?: string,
  location?: string
): Promise<ServicesWithPagination> {
  // If we have location filtering, use the more comprehensive filtering function
  if (location && location.trim() !== '') {
    return getFilteredServices(page, pageSize, search, location);
  }
  
  const supabase = await createClient();
  
  // Get published profile IDs
  const publishedProfileIds = await getPublishedProfileIds();
  if (publishedProfileIds.length === 0) {
    return createEmptyPaginationResult(page, pageSize);
  }
  
  // Create a query builder that we can modify based on search parameters
  let query = supabase
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
        hide_full_address,
        address:address_id(
          id,
          country,
          state,
          city,
          street_address,
          apartment,
          latitude,
          longitude
        ),
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
    .in('professional_profile_id', publishedProfileIds);
  
  // If there's a search term, add it to the query
  if (search && search.trim() !== '') {
    const trimmedSearch = search.trim();
    query = query.ilike('name', `%${trimmedSearch}%`);
  }
  
  // Get total count for pagination with same filters as main query
  let countQuery = supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .in('professional_profile_id', publishedProfileIds);
  
  // Apply the same search filter to count query
  if (search && search.trim() !== '') {
    const trimmedSearch = search.trim();
    countQuery = countQuery.ilike('name', `%${trimmedSearch}%`);
  }
  
  const { count, error: countError } = await countQuery;
  
  if (countError) {
    console.error('Error counting services:', countError);
    return createEmptyPaginationResult(page, pageSize);
  }
  
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  
  query = query.range(start, end);
  
  const { data: services, error } = await query;
  
  if (error) {
    console.error('Error fetching services:', error);
    return createEmptyPaginationResult(page, pageSize);
  }
  
  const pagination: PaginationInfo = {
    currentPage: page,
    totalPages,
    totalItems: totalCount,
    pageSize,
  };
  
  // Map the services to the expected format
  const mappedServices = await Promise.all((services || []).map(mapServiceData));
  
  return {
    services: mappedServices,
    pagination,
  };
}

/**
 * Client-side action to fetch services (for use in client components)
 */
export async function fetchServicesAction(
  page: number,
  pageSize: number,
  searchTerm: string
): Promise<ServicesWithPagination> {
  return getServices(page, pageSize, searchTerm);
}

/**
 * Fetches services with both service name and location filtering
 */
export async function getFilteredServices(
  page = 1,
  pageSize = 12,
  serviceName?: string,
  location?: string
): Promise<ServicesWithPagination> {
  const supabase = await createClient();
  
  // Get published profile IDs
  const publishedProfileIds = await getPublishedProfileIds();
  if (publishedProfileIds.length === 0) {
    return createEmptyPaginationResult(page, pageSize);
  }
  
  try {
    // For location filtering, we need to fetch all services and filter client-side
    // since we need to search across address components
    let query = supabase
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
          hide_full_address,
          address:address_id(
            id,
            country,
            state,
            city,
            street_address,
            apartment,
            latitude,
            longitude
          ),
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
      .in('professional_profile_id', publishedProfileIds);
    
    // Add service name filter if provided
    if (serviceName && serviceName.trim() !== '') {
      const trimmedSearch = serviceName.trim().toLowerCase();
      query = query.ilike('name', `%${trimmedSearch}%`);
    }
    
    const { data: allServices, error } = await query;
    
    if (error) {
      console.error('Error fetching services for filtering:', error);
      return createEmptyPaginationResult(page, pageSize);
    }
    
    let filteredServices = allServices || [];
    
    // Apply location filter if provided
    if (location && location.trim() !== '') {
      const locationLower = location.trim().toLowerCase();
      
      // Split location into individual search terms (city, country, etc.)
      const locationTerms = locationLower
        .split(',')
        .map(term => term.trim())
        .filter(term => term.length > 0);
      
      filteredServices = filteredServices.filter((service) => {
        const professionalProfile = service.professional_profile;
        if (!professionalProfile) return false;
        
        // Check legacy location field
        const legacyLocation = professionalProfile.location?.toLowerCase() || '';
        
        // Check address components if address exists
        const address = professionalProfile.address;
        
        // Collect all searchable address fields
        const searchableFields = [
          legacyLocation,
          address?.country?.toLowerCase() || '',
          address?.state?.toLowerCase() || '',
          address?.city?.toLowerCase() || '',
          address?.street_address?.toLowerCase() || '',
          address?.apartment?.toLowerCase() || '',
        ].filter(field => field.length > 0);
        
        // Check if ANY of the location terms match ANY of the searchable fields
        const matches = locationTerms.some(term => 
          searchableFields.some(field => 
            field.includes(term) || term.includes(field)
          )
        );
        
        return matches;
      });
    }
    
    // Calculate pagination for filtered results
    const totalCount = filteredServices.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = filteredServices.slice(start, end);
    
    const pagination: PaginationInfo = {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      pageSize,
    };
    
    const mappedServices = await Promise.all(paginatedResults.map(mapServiceData));
    
    return {
      services: mappedServices,
      pagination,
    };
  } catch (error) {
    console.error('Unexpected error in getFilteredServices:', error);
    return createEmptyPaginationResult(page, pageSize);
  }
} 