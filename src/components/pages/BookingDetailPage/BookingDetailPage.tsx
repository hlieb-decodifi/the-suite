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
    booking_payments: Array<{
      id: string;
      amount: number;
      status: string;
      payment_method_id: string;
      created_at: string;
    }>;
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
    // const appointment = await getAppointmentById(id);

    const supabase = await createClient();

    // First, check if the appointment exists
    const { error: checkError } = await supabase
      .from('appointments')
      .select('id, booking_id')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Error checking appointment:', checkError);
      throw new Error(`Appointment not found: ${checkError.message}`);
    }

    const appointment = await getAppointmentById(id);

    // Check if user has permission to view this appointment
    // const hasPermission = checkAppointmentPermission(
    //   appointment,
    //   user.id,
    //   !!isProfessional,
    // );

    // if (!hasPermission) {
    //   return notFound();
    // }

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
  try {
    const supabase = await createClient();

    // First, check if the appointment exists
    const { data: appointmentCheck, error: checkError } = await supabase
      .from('appointments')
      .select('id, booking_id')
      .eq('id', appointmentId)
      .single();

    if (checkError) {
      console.error('Error checking appointment:', checkError);
      throw new Error(`Appointment not found: ${checkError.message}`);
    }

    if (!appointmentCheck) {
      throw new Error('Appointment not found');
    }

    // Now get the full appointment data with all related info
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        date,
        start_time,
        end_time,
        status,
        created_at,
        updated_at,
        booking_id,
        bookings!booking_id(
          id,
          client_id,
          professional_profile_id,
          status,
          notes,
          created_at,
          updated_at,
          clients:client_id(
            id,
            first_name,
            last_name,
            client_profiles(
              id,
              phone_number,
              location,
              addresses:address_id(
                id,
                street_address,
                city,
                state,
                country
              )
            )
          ),
          professionals:professional_profile_id(
            id,
            user_id,
            description,
            profession,
            phone_number,
            location,
            addresses:address_id(
              id,
              street_address,
              city,
              state,
              country
            ),
            users:user_id(
              id,
              first_name,
              last_name
            )
          ),
          booking_services(
            id,
            service_id,
            price,
            duration,
            services(
              id,
              name,
              description
            )
          ),
          booking_payments(
            id,
            amount,
            status,
            payment_method_id,
            created_at
          )
        )
      `,
      )
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment details:', error);
      throw new Error(`Failed to fetch appointment details: ${error.message}`);
    }

    if (!data) {
      throw new Error('Appointment details not found');
    }

    return data as unknown as DetailedAppointmentType;
  } catch (error) {
    console.error('Error in getAppointmentById:', error);
    throw new Error('Failed to get appointment details');
  }
}

// Check if user has permission to view this appointment (simplified for now)
function checkAppointmentPermission(
  appointment: DetailedAppointmentType,
  userId: string,
  isProfessional: boolean,
): boolean {
  // For now, just check if client matches for non-professionals
  if (!isProfessional && appointment.bookings.client_id === userId) {
    return true;
  }

  // For professionals, we need to check if they own this appointment
  // We'll need to add a separate query for this later
  if (isProfessional) {
    // TODO: Add professional check after we get basic query working
    return true; // Allow all professionals for now
  }

  return false;
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
