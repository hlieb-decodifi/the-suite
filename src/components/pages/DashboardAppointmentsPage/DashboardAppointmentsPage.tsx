'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardAppointmentsPageClient } from './DashboardAppointmentsPageClient';
import { getDashboardAppointments } from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';
import { AppointmentType } from '@/components/common/AppointmentItem';

export type DashboardAppointmentsPageProps = {
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export async function DashboardAppointmentsPage({
  startDate,
  endDate,
}: DashboardAppointmentsPageProps) {
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

  // Get appointments for the dashboard with date filtering
  try {
    const appointments = await getDashboardAppointments(
      user.id,
      !!isProfessional,
      startDate,
      endDate,
    );

    return (
      <DashboardAppointmentsPageClient
        isProfessional={!!isProfessional}
        appointments={appointments as AppointmentType[]}
      />
    );
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return (
      <DashboardAppointmentsPageClient
        isProfessional={!!isProfessional}
        appointments={[]}
      />
    );
  }
}

// Get appointment details by ID
export async function getAppointmentById(appointmentId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        updated_at,
        location,
        service_id,
        services(id, name, description, duration, price),
        professional_id,
        professionals:professional_id(
          id, 
          user_id, 
          users:user_id(id, first_name, last_name, email)
        ),
        client_id,
        clients:client_id(
          id,
          user_id,
          users:user_id(id, first_name, last_name, email)
        ),
        booking_payments(id, amount, status, payment_method, created_at)
      `,
      )
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      throw new Error(`Failed to fetch appointment: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getAppointmentById:', error);
    throw new Error('Failed to get appointment details');
  }
}

// Define type for appointment with required fields for permission check
type AppointmentWithPermissionFields = {
  id: string;
  professionals?: {
    user_id: string;
  };
  clients?: {
    user_id: string;
  };
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
        'id, professional_id, client_id, professionals(user_id), clients(user_id)',
      )
      .eq('id', appointmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
    }

    // Cast data to the expected type
    const appointment = data as unknown as AppointmentWithPermissionFields;

    // Check if user has permission (is either the professional or client for this appointment)
    let canUpdate = false;

    if (
      isProfessional &&
      appointment?.professionals &&
      appointment.professionals.user_id === userId
    ) {
      canUpdate = true;
    } else if (
      !isProfessional &&
      appointment?.clients &&
      appointment.clients.user_id === userId
    ) {
      canUpdate = true;
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
