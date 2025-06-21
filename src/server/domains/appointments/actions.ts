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

/**
 * Add additional services to an existing appointment
 * Server action for professionals to modify appointment totals
 */
export async function addServicesToAppointment(
  appointmentId: string,
  serviceIds: string[],
  notes?: string
): Promise<AddServicesResult> {
  try {
    if (!serviceIds || serviceIds.length === 0) {
      return {
        success: false,
        error: 'Service IDs are required'
      };
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Verify the appointment belongs to this professional
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        booking_id,
        status,
        bookings!inner(
          professional_profile_id,
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

    // Check if user owns this appointment
    const professionalUserId = (appointment.bookings as { professional_profiles: { user_id: string } }).professional_profiles.user_id;
    if (professionalUserId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only modify your own appointments'
      };
    }

    // Check if appointment is in a valid state for modification
    if (!['upcoming', 'completed'].includes(appointment.status)) {
      return {
        success: false,
        error: 'Cannot modify cancelled appointments'
      };
    }

    // Get the services to add
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .in('id', serviceIds);

    if (servicesError || !services || services.length !== serviceIds.length) {
      return {
        success: false,
        error: 'One or more services not found'
      };
    }

    // Calculate additional amount
    const additionalAmount = services.reduce((total, service) => total + service.price, 0);
    const additionalDuration = services.reduce((total, service) => total + service.duration, 0);

    // Add services to booking_services
    const bookingServicesData = services.map(service => ({
      booking_id: appointment.booking_id,
      service_id: service.id,
      price: service.price,
      duration: service.duration
    }));

    const { error: insertError } = await supabase
      .from('booking_services')
      .insert(bookingServicesData);

    if (insertError) {
      return {
        success: false,
        error: 'Failed to add services to booking'
      };
    }

    // Get current payment amount and update it
    const { data: currentPayment } = await supabase
      .from('booking_payments')
      .select('amount')
      .eq('booking_id', appointment.booking_id)
      .single();

    const newTotalAmount = (currentPayment?.amount || 0) + additionalAmount;

    // Update booking payment amount
    const { error: paymentUpdateError } = await supabase
      .from('booking_payments')
      .update({
        amount: newTotalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', appointment.booking_id);

    if (paymentUpdateError) {
      console.error('Failed to update payment amount:', paymentUpdateError);
      // Continue anyway - services were added successfully
    }

    // Add notes about the service addition
    if (notes) {
      const { error: notesError } = await supabase
        .from('bookings')
        .update({
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.booking_id);

      if (notesError) {
        console.error('Failed to update booking notes:', notesError);
      }
    }

    // TODO: Update Stripe payment intent with new amount if payment is authorized but not captured
    // This would require checking the payment status and updating the payment intent amount

    // Revalidate relevant pages
    revalidatePath(`/dashboard/appointments`);
    revalidatePath(`/bookings/${appointment.booking_id}`);

    return {
      success: true,
      addedServices: services,
      additionalAmount,
      additionalDuration,
      newTotalAmount
    };

  } catch (error) {
    console.error('Error adding services to appointment:', error);
    return {
      success: false,
      error: 'Failed to add services. Please try again.'
    };
  }
}

/**
 * Get available services for a professional to add to an appointment
 */
export async function getAvailableServicesForAppointment(appointmentId: string) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Get the professional profile ID from the appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        booking_id,
        bookings!inner(
          professional_profile_id,
          professional_profiles!inner(
            user_id
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return {
        success: false,
        error: 'Appointment not found'
      };
    }

    const professionalUserId = (appointment.bookings as { professional_profiles: { user_id: string }; professional_profile_id: string }).professional_profiles.user_id;
    if (professionalUserId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    const professionalProfileId = (appointment.bookings as { professional_profile_id: string }).professional_profile_id;

    // Get all services for this professional
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, description, price, duration')
      .eq('professional_profile_id', professionalProfileId)
      .order('name');

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch services'
      };
    }

    return {
      success: true,
      services: services || []
    };

  } catch (error) {
    console.error('Error getting available services:', error);
    return {
      success: false,
      error: 'Failed to fetch services'
    };
  }
} 