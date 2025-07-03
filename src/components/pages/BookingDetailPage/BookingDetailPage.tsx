'use server';

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { BookingDetailPageClient } from './BookingDetailPageClient';

// Full appointment type with all related data
export type DetailedAppointmentType = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  computed_status: string;
  created_at: string;
  updated_at: string;
  booking_id: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    status: string;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    clients: {
      id: string;
      first_name: string;
      last_name: string;
      client_profiles: {
        id: string;
        phone_number?: string | null;
        location?: string | null;
        addresses?: {
          id: string;
          street_address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        } | null;
      } | null;
    } | null;
    professionals: {
      id: string;
      user_id: string;
      description?: string | null;
      profession?: string | null;
      phone_number?: string | null;
      location?: string | null;
      addresses?: {
        id: string;
        street_address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      users: {
        id: string;
        first_name: string;
        last_name: string;
      };
    } | null;
    booking_services: Array<{
      id: string;
      service_id: string;
      price: number;
      duration: number;
      services: {
        id: string;
        name: string;
        description?: string;
      };
    }>;
    booking_payments: {
      id: string;
      amount: number;
      tip_amount: number;
      status: string;
      payment_method_id: string;
      stripe_payment_method_id: string | null;
      stripe_payment_intent_id: string | null;
      pre_auth_scheduled_for: string | null;
      capture_scheduled_for: string | null;
      pre_auth_placed_at: string | null;
      captured_at: string | null;
      created_at: string;
      service_fee: number;
      // Refund tracking fields
      refunded_amount: number;
      refund_reason: string | null;
      refunded_at: string | null;
      refund_transaction_id: string | null;
      payment_methods: {
        id: string;
        name: string;
        is_online: boolean;
      } | null;
    } | null;
  };
};

export async function BookingDetailPage({ id }: { id: string }) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if user is professional
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  // Get appointment details
  try {
    const supabase = await createClient();

    // First, check if the appointment exists
    const { error: checkError } = await supabase
      .from('appointments_with_status')
      .select('id, booking_id, computed_status')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Error checking appointment:', checkError);
      throw new Error(`Appointment not found: ${checkError.message}`);
    }

    const appointment = await getAppointmentById(id);

    console.log('appointment', appointment);

    // Check if user has permission to view this appointment
    const hasPermission = checkAppointmentPermission(
      appointment,
      user.id,
      !!isProfessional,
    );

    if (!hasPermission) {
      return notFound();
    }

    return (
      <BookingDetailPageClient
        appointment={appointment}
        isProfessional={!!isProfessional}
        currentUserId={user.id}
      />
    );
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return notFound();
  }
}

// Get appointment details by ID with enhanced data
export async function getAppointmentById(
  appointmentId: string,
): Promise<DetailedAppointmentType> {
  const supabase = await createClient();
  try {
    // First, check if the appointment exists
    const { data: appointmentCheck, error: checkError } = await supabase
      .from('appointments_with_status')
      .select('id, booking_id, computed_status')
      .eq('id', appointmentId)
      .single();

    if (checkError) {
      console.error('Error checking appointment:', checkError);
      throw new Error(`Appointment not found: ${checkError.message}`);
    }

    if (!appointmentCheck) {
      throw new Error('Appointment not found');
    }

    console.log('Appointment check:', {
      id: appointmentCheck.id,
      computed_status: appointmentCheck.computed_status,
    });

    // Now get the full appointment data with all related info
    const { data, error } = await supabase
      .from('appointments_with_status')
      .select(
        `
        id,
        date,
        start_time,
        end_time,
        status,
        computed_status,
        created_at,
        updated_at,
        booking_id,
        bookings!inner (
          id,
          client_id,
          professional_profile_id,
          status,
          notes,
          created_at,
          updated_at,
          clients:users!client_id (
            id,
            first_name,
            last_name,
            client_profiles (
              id,
              phone_number,
              location,
              addresses (
                id,
                street_address,
                city,
                state,
                country,
                latitude,
                longitude
              )
            )
          ),
          professionals:professional_profiles!professional_profile_id (
            id,
            user_id,
            description,
            profession,
            phone_number,
            location,
            addresses (
              id,
              street_address,
              city,
              state,
              country,
              latitude,
              longitude
            ),
            users (
              id,
              first_name,
              last_name
            )
          ),
          booking_services (
            id,
            service_id,
            price,
            duration,
            services (
              id,
              name,
              description
            )
          ),
          booking_payments (
            id,
            amount,
            tip_amount,
            status,
            payment_method_id,
            stripe_payment_method_id,
            stripe_payment_intent_id,
            pre_auth_scheduled_for,
            capture_scheduled_for,
            pre_auth_placed_at,
            captured_at,
            created_at,
            refunded_amount,
            refund_reason,
            refunded_at,
            refund_transaction_id,
            service_fee,
            payment_methods (
              id,
              name,
              is_online
            )
          )
        )
      `,
      )
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      throw new Error(`Failed to fetch appointment: ${error.message}`);
    }

    if (!data) {
      throw new Error('Appointment not found');
    }

    console.log('Fetched appointment:', {
      id: data.id,
      status: data.status,
      computed_status: data.computed_status,
      raw: data,
    });

    // Verify that the computed_status is one of the expected values
    if (
      !data.computed_status ||
      !['upcoming', 'completed', 'cancelled'].includes(data.computed_status)
    ) {
      console.error('Invalid computed_status value:', data.computed_status);
      throw new Error(`Invalid computed_status value: ${data.computed_status}`);
    }

    // Verify that the computed_status matches the expected value based on the appointment data
    const currentDateTime = new Date();
    const appointmentDateTime = new Date(`${data.date} ${data.end_time}`);
    const expectedStatus =
      data.status === 'cancelled'
        ? 'cancelled'
        : currentDateTime > appointmentDateTime
          ? 'completed'
          : 'upcoming';

    if (data.computed_status !== expectedStatus) {
      console.error('Computed status mismatch:', {
        computed_status: data.computed_status,
        expected_status: expectedStatus,
        current_datetime: currentDateTime,
        appointment_datetime: appointmentDateTime,
      });
      throw new Error(
        `Computed status mismatch: expected ${expectedStatus}, got ${data.computed_status}`,
      );
    }

    // Verify that the computed_status is being returned in the response
    const { data: verifyData, error: verifyError } = await supabase
      .from('appointments_with_status')
      .select('id, computed_status')
      .eq('id', appointmentId)
      .single();

    if (verifyError) {
      console.error('Error verifying computed_status:', verifyError);
      throw new Error(
        `Failed to verify computed_status: ${verifyError.message}`,
      );
    }

    if (!verifyData || !verifyData.computed_status) {
      console.error(
        'Missing computed_status in verification data:',
        verifyData,
      );
      throw new Error('Missing computed_status in verification data');
    }

    if (verifyData.computed_status !== data.computed_status) {
      console.error('Computed status inconsistency:', {
        original_status: data.computed_status,
        verify_status: verifyData.computed_status,
      });
      throw new Error(
        `Computed status inconsistency: ${data.computed_status} vs ${verifyData.computed_status}`,
      );
    }

    return data as DetailedAppointmentType;
  } catch (error) {
    console.error('Error in getAppointmentById:', error);
    // Check if the error is related to the computed status
    if (error instanceof Error && error.message.includes('computed_status')) {
      // Log additional information about the appointment
      const { data: debugData } = await supabase
        .from('appointments')
        .select('id, date, start_time, end_time, status')
        .eq('id', appointmentId)
        .single();
      console.error('Debug data:', debugData);
    }
    throw error;
  }
}

// Check if user has permission to view this appointment
function checkAppointmentPermission(
  appointment: DetailedAppointmentType,
  userId: string,
  isProfessional: boolean,
): boolean {
  if (isProfessional) {
    // Professional can only view their own appointments
    return (
      appointment.bookings.professionals?.user_id === userId ||
      appointment.bookings.professionals?.users.id === userId
    );
  } else {
    // Client can only view their own appointments
    return (
      appointment.bookings.client_id === userId ||
      appointment.bookings.clients?.id === userId
    );
  }
}

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
    const appointment = await getAppointmentById(appointmentId);

    const hasPermission = checkAppointmentPermission(
      appointment,
      userId,
      isProfessional,
    );

    if (!hasPermission) {
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
