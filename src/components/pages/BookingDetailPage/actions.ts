'use server';

import { createClient } from '@/lib/supabase/server';

// Type for appointment permission check through bookings
type AppointmentWithBooking = {
  id: string;
  booking_id: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    professionals: {
      user_id: string;
    } | null;
  } | null;
};

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  userId: string,
  isProfessional: boolean,
) {
  try {
    const supabase = await createClient();

    // First verify that the user has permission to update this appointment
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_id,
        bookings!booking_id(
          id,
          client_id,
          professional_profile_id,
          professionals:professional_profile_id(
            user_id
          )
        )
        `,
      )
      .eq('id', appointmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
    }

    const appointmentData = data as AppointmentWithBooking;

    // Check if user has permission (is either the professional or client for this appointment)
    let canUpdate = false;

    if (appointmentData?.bookings) {
      if (
        isProfessional &&
        appointmentData.bookings.professionals &&
        appointmentData.bookings.professionals.user_id === userId
      ) {
        canUpdate = true;
      } else if (
        !isProfessional &&
        appointmentData.bookings.client_id === userId
      ) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      throw new Error('You do not have permission to update this appointment');
    }

    // Update the appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update appointment status',
    };
  }
} 