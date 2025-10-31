import { createClient } from '@/lib/supabase/server';

// Types for reviews
export type ReviewData = {
  id: string;
  appointmentId: string;
  clientId: string;
  professionalId: string;
  score: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientAvatar?: string;
};

export type ProfessionalRatingStats = {
  averageRating: number;
  totalReviews: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
};

/**
 * Get professional's rating statistics
 */
export async function getProfessionalRatingStats(
  professionalId: string,
): Promise<ProfessionalRatingStats | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      'get_professional_rating_stats',
      {
        p_professional_id: professionalId,
      },
    );

    if (error) {
      console.error('Error fetching professional rating stats:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      };
    }

    const stats = data[0];
    return {
      averageRating: parseFloat(stats?.average_rating?.toString() || '0') || 0,
      totalReviews: stats?.total_reviews || 0,
      fiveStar: stats?.five_star || 0,
      fourStar: stats?.four_star || 0,
      threeStar: stats?.three_star || 0,
      twoStar: stats?.two_star || 0,
      oneStar: stats?.one_star || 0,
    };
  } catch (error) {
    console.error('Error in getProfessionalRatingStats:', error);
    return null;
  }
}

/**
 * Get reviews for a professional (respects admin config for minimum reviews)
 * @param professionalId - The professional's user ID
 * @param forOwnProfile - Whether this is for the professional's own profile (bypasses min requirement)
 */
export async function getProfessionalReviews(
  professionalId: string,
  forOwnProfile: boolean = false,
): Promise<ReviewData[]> {
  try {
    const supabase = await createClient();

    // First get the minimum reviews threshold from admin config
    const { data: minReviewsData } = await supabase.rpc('get_admin_config', {
      config_key: 'min_reviews_to_display',
    });

    const minReviews = parseInt(minReviewsData || '5');

    // Get the total review count for this professional
    const stats = await getProfessionalRatingStats(professionalId);
    const totalReviews = stats?.totalReviews || 0;

    // If it's for own profile, always show reviews regardless of count
    // Otherwise, check if they meet the minimum threshold
    if (!forOwnProfile && totalReviews < minReviews) {
      return [];
    }

    // Fetch the actual reviews with simplified query
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(
        `
        id,
        appointment_id,
        client_id,
        professional_id,
        score,
        message,
        created_at,
        updated_at
      `,
      )
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Fetch client info separately to avoid complex joins
    const reviewsWithClients = await Promise.all(
      (reviews || []).map(async (review) => {
        const { data: clientData } = await supabase
          .from('users')
          .select('first_name, last_name, profile_photos(url)')
          .eq('id', review.client_id)
          .single();

        return {
          id: review.id,
          appointmentId: review.appointment_id,
          clientId: review.client_id,
          professionalId: review.professional_id,
          score: review.score,
          message: review.message,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
          clientName: clientData
            ? `${clientData.first_name} ${clientData.last_name}`
            : 'Anonymous Client',
          clientAvatar: Array.isArray(clientData?.profile_photos)
            ? clientData.profile_photos[0]?.url
            : clientData?.profile_photos?.url,
        };
      }),
    );

    return reviewsWithClients;
  } catch (error) {
    console.error('Error in getProfessionalReviews:', error);
    return [];
  }
}

/**
 * Check if professional meets minimum review threshold for public display
 */
export async function shouldShowPublicReviews(
  professionalId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get the minimum reviews threshold from admin config
    const { data: minReviewsData } = await supabase.rpc('get_admin_config', {
      config_key: 'min_reviews_to_display',
    });

    const minReviews = parseInt(minReviewsData || '5');

    // Get the total review count for this professional
    const stats = await getProfessionalRatingStats(professionalId);
    const totalReviews = stats?.totalReviews || 0;

    return totalReviews >= minReviews;
  } catch (error) {
    console.error('Error in shouldShowPublicReviews:', error);
    return false;
  }
}
