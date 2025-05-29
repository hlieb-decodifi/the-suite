import { createClient } from '@/lib/supabase/server';

/**
 * Get counts of appointments by status for a user
 */
export async function getAppointmentsCountByStatus(userId: string) {
  try {
    const supabase = await createClient();
    
    // Get if user is professional
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: userId,
    });
    
    // Get professional profile ID if professional
    let professionalProfileId: string | null = null;
    if (isProfessional) {
      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      professionalProfileId = profile?.id || null;
    }
    
    // First, get the bookings that belong to this user
    let bookingsQuery = supabase.from('bookings').select('id');
    
    // Filter based on user role
    if (isProfessional && professionalProfileId) {
      bookingsQuery = bookingsQuery.eq('professional_profile_id', professionalProfileId);
    } else {
      bookingsQuery = bookingsQuery.eq('client_id', userId);
    }
    
    const { data: bookingsData, error: bookingsError } = await bookingsQuery;
    
    if (bookingsError || !bookingsData || bookingsData.length === 0) {
      console.error('Error fetching bookings:', bookingsError);
      return {
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        total: 0,
      };
    }
    
    // Get all booking IDs
    const bookingIds = bookingsData.map(booking => booking.id);
    
    // Now fetch appointments with their status
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, status')
      .in('booking_id', bookingIds);
    
    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return {
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        total: 0,
      };
    }
    
    // Count appointments by status
    const upcomingCount = appointmentsData.filter(app => 
      app.status === 'upcoming' || app.status === 'confirmed' || app.status === 'pending'
    ).length;
    
    const completedCount = appointmentsData.filter(app => 
      app.status === 'completed'
    ).length;
    
    const cancelledCount = appointmentsData.filter(app => 
      app.status === 'cancelled'
    ).length;
    
    return {
      upcoming: upcomingCount,
      completed: completedCount,
      cancelled: cancelledCount,
      total: appointmentsData.length,
    };
  } catch (error) {
    console.error('Error in getAppointmentsCountByStatus:', error);
    return {
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };
  }
} 