'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type AddServicesResult = {
  success: boolean;
  error?: string;
  addedServices?: {
    id: string;
    name: string;
    price: number;
    duration: number;
  }[];
  additionalAmount?: number;
  additionalDuration?: number;
  newTotalAmount?: number;
}

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
    
    if (bookingsError !== null || !bookingsData) {
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
    
    // Now fetch appointments with their computed status
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments_with_status')
      .select('id, computed_status')
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
    
    // Count appointments by computed status
    const upcomingCount = appointmentsData.filter(app => 
      app.computed_status === 'upcoming'
    ).length;
    
    const completedCount = appointmentsData.filter(app => 
      app.computed_status === 'completed'
    ).length;
    
    const cancelledCount = appointmentsData.filter(app => 
      app.computed_status === 'cancelled'
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

/**
 * Type for available services
 */
type AvailableService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
}

/**
 * Get available services for a specific appointment
 * Only returns services that belong to the professional and aren't already added to this booking
 */
export async function getAvailableServicesForAppointment(
  appointmentId: string
): Promise<{ success: boolean; services?: AvailableService[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // First, get the appointment details with professional profile ID
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        booking_id,
        status,
        bookings!inner(
          professional_profile_id
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return {
        success: false,
        error: 'Appointment not found'
      };
    }

    const professionalProfileId = (appointment.bookings as { professional_profile_id: string }).professional_profile_id;

    // Get all services for this professional
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('id, name, description, price, duration')
      .eq('professional_profile_id', professionalProfileId)
      .eq('stripe_status', 'active')
      .order('name');

    if (servicesError) {
      return {
        success: false,
        error: 'Failed to fetch professional services'
      };
    }

    // Get services already added to this booking
    const { data: existingServices, error: existingError } = await supabase
      .from('booking_services')
      .select('service_id')
      .eq('booking_id', appointment.booking_id);

    if (existingError) {
      return {
        success: false,
        error: 'Failed to fetch existing booking services'
      };
    }

    // Filter out services already added to this booking
    const existingServiceIds = new Set(existingServices?.map(bs => bs.service_id) || []);
    const availableServices = (allServices || []).filter(
      service => !existingServiceIds.has(service.id)
    );

    return {
      success: true,
      services: availableServices
    };

  } catch (error) {
    console.error('Error fetching available services for appointment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add services to an existing appointment
 * This updates the booking total and may require additional payment
 */
export async function addServicesToAppointment(
  appointmentId: string,
  serviceIds: string[]
): Promise<{ 
  success: boolean; 
  addedServices?: { id: string; name: string; price: number }[];
  newTotal?: number;
  error?: string 
}> {
  try {
    if (!serviceIds || serviceIds.length === 0) {
      return {
        success: false,
        error: 'No services selected'
      };
    }

    const supabase = await createClient();
    
    // Get user ID from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Get appointment details and verify professional ownership
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        booking_id,
        status,
        bookings!inner(
          id,
          professional_profile_id,
          status,
          booking_payments(
            id,
            amount,
            tip_amount,
            service_fee
          ),
          professional_profiles!inner(
            user_id
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return {
        success: false,
        error: 'Appointment not found'
      };
    }

    // Verify the authenticated user is the professional for this appointment
    const professionalUserId = (appointment.bookings as { professional_profiles: { user_id: string } }).professional_profiles.user_id;
    if (professionalUserId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only modify your own appointments'
      };
    }

    // Check appointment status - only allow modifications for upcoming appointments
    if (appointment.status !== 'upcoming') {
      return {
        success: false,
        error: 'Services can only be added to upcoming appointments'
      };
    }

    const professionalProfileId = (appointment.bookings as { professional_profile_id: string }).professional_profile_id;
    const bookingId = appointment.booking_id;

    // Get the services to be added and verify they belong to this professional
    const { data: servicesToAdd, error: servicesError } = await supabase
      .from('services')
      .select('id, name, description, price, duration')
      .eq('professional_profile_id', professionalProfileId)
      .in('id', serviceIds);

    if (servicesError || !servicesToAdd) {
      return {
        success: false,
        error: 'Failed to fetch services'
      };
    }

    if (servicesToAdd.length !== serviceIds.length) {
      return {
        success: false,
        error: 'Some services not found or do not belong to this professional'
      };
    }

    // Check if any of these services are already added to the booking
    const { data: existingServices, error: existingError } = await supabase
      .from('booking_services')
      .select('service_id')
      .eq('booking_id', bookingId)
      .in('service_id', serviceIds);

    if (existingError) {
      return {
        success: false,
        error: 'Failed to check existing services'
      };
    }

    if (existingServices && existingServices.length > 0) {
      return {
        success: false,
        error: 'Some services are already added to this booking'
      };
    }

    // Add services to the booking
    const bookingServices = servicesToAdd.map(service => ({
      booking_id: bookingId,
      service_id: service.id,
      price: service.price,
      duration: service.duration
    }));

    const { error: insertError } = await supabase
      .from('booking_services')
      .insert(bookingServices);

    if (insertError) {
      return {
        success: false,
        error: 'Failed to add services to booking'
      };
    }

    // Calculate new total
    const { data: allBookingServices, error: totalError } = await supabase
      .from('booking_services')
      .select('price')
      .eq('booking_id', bookingId);

    if (totalError) {
      console.error('Error calculating new total:', totalError);
      return {
        success: false,
        error: 'Failed to calculate new total'
      };
    }

    const newTotal = allBookingServices.reduce((sum, service) => sum + service.price, 0);

    // Update the booking payment amount
    const booking = appointment.bookings as {
      booking_payments: {
        id: string;
        amount: number;
        tip_amount: number;
        service_fee: number;
      } | null;
    };

    if (booking.booking_payments) {
      const payment = booking.booking_payments;
      const { error: updatePaymentError } = await supabase
        .from('booking_payments')
        .update({
          amount: newTotal + (payment.service_fee || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updatePaymentError) {
        return {
          success: false,
          error: 'Failed to update payment amount'
        };
      }
    }

    // Revalidate relevant paths
    revalidatePath(`/bookings/${appointmentId}`);
    revalidatePath('/dashboard/appointments');

    return {
      success: true,
      addedServices: servicesToAdd.map(service => ({
        id: service.id,
        name: service.name,
        price: service.price
      })),
      newTotal
    };

  } catch (error) {
    console.error('Error adding services to appointment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 