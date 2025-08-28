'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

type ReviewData = {
  id: string;
  score: number;
  message: string;
  createdAt: string;
};

type ReviewStatus = {
  canReview: boolean;
  hasReview: boolean;
  review: ReviewData | null;
};

/**
 * Submit a review for a completed appointment
 */
export async function submitReview(
  bookingId: string,
  score: number,
  message: string
): Promise<{
  success: boolean;
  review?: ReviewData;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Validate input
    if (!score || score < 1 || score > 5) {
      return {
        success: false,
        error: 'Score must be between 1 and 5'
      };
    }

    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Review message is required'
      };
    }

    // Get booking and appointment details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        professional_profile_id,
        appointments_with_status (
          id,
          status,
          computed_status
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Verify the user owns this booking
    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    // Check if appointment exists and is completed
    const appointment = Array.isArray(booking.appointments_with_status) 
      ? booking.appointments_with_status[0] 
      : booking.appointments_with_status;
    
    if (!appointment || !appointment.id) {
      return {
        success: false,
        error: 'No appointment found for this booking'
      };
    }
    const appointmentId = appointment.id;
    
    if (!appointmentId) {
      return {
        success: false,
        error: 'Invalid appointment ID'
      };
    }
    
    if (appointment.computed_status !== 'completed') {
      return {
        success: false,
        error: 'Appointment must be completed to leave a review'
      };
    }

    // Get professional user ID
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('user_id')
      .eq('id', booking.professional_profile_id)
      .single();

    if (profileError || !professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found'
      };
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();

    if (existingReview) {
      return {
        success: false,
        error: 'Review already exists for this appointment'
      };
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        appointment_id: appointmentId,
        client_id: user.id,
        professional_id: professionalProfile.user_id,
        score,
        message: message.trim()
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return {
        success: false,
        error: 'Failed to create review'
      };
    }

    return {
      success: true,
      review: {
        id: review.id,
        score: review.score,
        message: review.message,
        createdAt: review.created_at
      }
    };

  } catch (error) {
    console.error('Error creating review:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Get review status for a booking
 */
export async function getReviewStatus(
  bookingId: string,
  isAdmin: boolean = false
): Promise<{
  success: boolean;
  reviewStatus?: ReviewStatus;
  error?: string;
}> {
  try {
    // Use admin client for admin queries to bypass RLS
    const supabase = isAdmin ? createAdminClient() : await createClient();
    
    // Get the current user (always from regular client for user context)
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // First, get the appointment details to check review status
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        start_time,
        end_time,
        booking_id,
        bookings!inner (
          id,
          client_id,
          professional_profile_id,
          professional_profiles!inner (
            user_id
          )
        ),
        reviews (
          id,
          score,
          message,
          created_at
        )
      `)
      .eq('booking_id', bookingId)
      .single();

    if (appointmentError || !appointment) {
      return {
        success: false,
        error: 'Appointment not found'
      };
    }

    const booking = appointment.bookings;
    const professionalUserId = booking.professional_profiles.user_id;

    // Check user authorization
    const isClient = booking.client_id === user.id;
    const isProfessional = professionalUserId === user.id;
    
    if (!isClient && !isProfessional && !isAdmin) {
      return {
        success: false,
        error: 'Unauthorized - You can only view reviews for your own appointments'
      };
    }

    // Get computed status using the function from schema
    const { data: computedStatusData } = await supabase.rpc('get_appointment_computed_status', {
      p_start_time: appointment.start_time,
      p_end_time: appointment.end_time,
      p_status: appointment.status
    });

    const computedStatus = computedStatusData || appointment.status;
    const existingReview = Array.isArray(appointment.reviews) && appointment.reviews.length > 0 
      ? appointment.reviews[0] 
      : appointment.reviews || null;

    const reviewStatus: ReviewStatus = {
      // Only clients can create reviews, and only for completed appointments without existing reviews
      canReview: isClient && computedStatus === 'completed' && !existingReview,
      hasReview: !!existingReview,
      review: existingReview ? {
        id: existingReview.id,
        score: existingReview.score,
        message: existingReview.message,
        createdAt: existingReview.created_at
      } : null
    };

    return {
      success: true,
      reviewStatus
    };

  } catch (error) {
    console.error('Error fetching review status:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
} 