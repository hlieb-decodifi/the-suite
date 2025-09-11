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
      .from('appointments_with_status')
      .select(
        `
        id,
        start_time,
        end_time,
        status,
        computed_status,
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

// Note: AppointmentWithPermissionFields type removed - was only used by removed updateAppointmentStatus function

// Note: updateAppointmentStatus function removed - was unused
// All appointment status updates now handled by server actions or BookingDetailPage/actions.ts
