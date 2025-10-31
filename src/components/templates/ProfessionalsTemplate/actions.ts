'use server';

import { createClient } from '@/lib/supabase/server';
import { ProfessionalListItem, PaginationInfo } from './types';
import {
  getProfessionalRatingStats,
  shouldShowPublicReviews,
} from '@/api/reviews/api';

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
 * Maps raw professional data to the ProfessionalListItem type
 */
async function mapProfessionalData(
  professional: unknown,
): Promise<ProfessionalListItem> {
  // Safely type cast the professional object
  const professionalData = professional as {
    id: string;
    user_id: string;
    profession: string | null;
    description: string | null;
    location: string | null;
    created_at: string;
    hide_full_address: boolean;
    address: {
      id: string;
      country: string;
      state: string;
      city: string;
      street_address: string;
      apartment: string;
      latitude: string;
      longitude: string;
    } | null;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo: {
        url: string;
      } | null;
    };
    services: { id: string }[];
  };

  const user = professionalData?.user;
  const rawPhotoUrl = user?.profile_photo?.url;

  // Generate proper public URL for the avatar
  const profilePhoto = getPublicImageUrl(rawPhotoUrl);

  // Calculate service count
  const serviceCount = professionalData?.services?.length || 0;

  // Get real review data
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
    console.error(
      'Error fetching review stats for professional:',
      user?.id,
      error,
    );
  }

  // Return mapped professional data
  return {
    id: professionalData.id,
    user_id: user?.id || 'unknown',
    name: user
      ? `${user.first_name} ${user.last_name}`
      : 'Unknown Professional',
    avatar: profilePhoto,
    profession: professionalData.profession || undefined,
    description: professionalData.description || undefined,
    location: professionalData.location || undefined,
    rating,
    reviewCount,
    serviceCount,
    isSubscribed: true, // TODO: Replace with dynamic subscription check
    joinedDate: professionalData.created_at,
    hide_full_address: professionalData.hide_full_address,
    address: professionalData.address
      ? {
          ...professionalData.address,
          latitude: parseFloat(professionalData.address.latitude),
          longitude: parseFloat(professionalData.address.longitude),
        }
      : null,
  };
}

// Define a return type that includes pagination metadata
export type ProfessionalsWithPagination = {
  professionals: ProfessionalListItem[];
  pagination: PaginationInfo;
};

/**
 * Create empty pagination result
 */
function createEmptyPaginationResult(
  page: number,
  pageSize: number,
): ProfessionalsWithPagination {
  return {
    professionals: [],
    pagination: {
      currentPage: page,
      totalPages: 0,
      totalItems: 0,
      pageSize,
    },
  };
}

/**
 * Fetches published professionals with their information from Supabase with pagination
 */
export async function getProfessionals(
  page = 1,
  pageSize = 12,
  search?: string,
): Promise<ProfessionalsWithPagination> {
  const supabase = await createClient();

  try {
    // If search is provided, we need to search across both professional_profiles and users tables
    if (search && search.trim() !== '') {
      const trimmedSearch = search.trim();

      // First, get all published professional profiles with user data
      const { data: allProfessionals, error: fetchError } = await supabase
        .from('professional_profiles')
        .select(
          `
          id,
          user_id,
          profession,
          description,
          location,
          created_at,
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
          ),
          services(
            id
          )
        `,
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching professionals for search:', fetchError);
        return createEmptyPaginationResult(page, pageSize);
      }

      // Filter results on the client side to include name searches
      const filteredProfessionals = (allProfessionals || []).filter((prof) => {
        const searchLower = trimmedSearch.toLowerCase();
        const profession = prof.profession?.toLowerCase() || '';
        const location = prof.location?.toLowerCase() || '';
        const description = prof.description?.toLowerCase() || '';
        const firstName = prof.user?.first_name?.toLowerCase() || '';
        const lastName = prof.user?.last_name?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.toLowerCase();

        return (
          profession.includes(searchLower) ||
          location.includes(searchLower) ||
          description.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower)
        );
      });

      // Calculate pagination for filtered results
      const totalCount = filteredProfessionals.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedResults = filteredProfessionals.slice(start, end);

      const pagination: PaginationInfo = {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        pageSize,
      };

      const mappedProfessionals = await Promise.all(
        paginatedResults.map(mapProfessionalData),
      );

      return {
        professionals: mappedProfessionals,
        pagination,
      };
    } else {
      // No search - use database pagination for better performance
      const { count, error: countError } = await supabase
        .from('professional_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      if (countError) {
        console.error('Error counting professionals:', countError);
        return createEmptyPaginationResult(page, pageSize);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data: professionals, error } = await supabase
        .from('professional_profiles')
        .select(
          `
          id,
          user_id,
          profession,
          description,
          location,
          created_at,
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
          ),
          services(
            id
          )
        `,
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.error('Error fetching professionals:', error);
        return createEmptyPaginationResult(page, pageSize);
      }

      const pagination: PaginationInfo = {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        pageSize,
      };

      const mappedProfessionals = await Promise.all(
        (professionals || []).map(mapProfessionalData),
      );

      return {
        professionals: mappedProfessionals,
        pagination,
      };
    }
  } catch (error) {
    console.error('Unexpected error in getProfessionals:', error);
    return createEmptyPaginationResult(page, pageSize);
  }
}

/**
 * Client-side action to fetch professionals (for use in client components)
 */
export async function fetchProfessionalsAction(
  page: number,
  pageSize: number,
  searchTerm: string,
): Promise<ProfessionalsWithPagination> {
  return getProfessionals(page, pageSize, searchTerm);
}
