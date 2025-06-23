'use server';

import { AppointmentType } from '@/components/common/AppointmentItem';
import { getDashboardAppointments } from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';
import { createClient } from '@/lib/supabase/server';
import { getRecentConversations } from '@/server/domains/messages/actions';
import { redirect } from 'next/navigation';
import { DashboardPageClient } from './DashboardPageClient';

// Define our own type for how the appointment data is actually structured
type AppointmentWithServices = {
  id: string;
  booking_id: string;
  start_time: string;
  end_time: string;
  status: string;
  services?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
};

export type DashboardPageProps = {
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export async function DashboardPage({
  startDate,
  endDate,
}: DashboardPageProps) {
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

  // Determine date range for filtering
  // If no date range is provided, use start of today for upcoming appointments
  let filterStartDate = startDate;
  const filterEndDate = endDate;

  if (!startDate && !endDate) {
    // Default behavior: show upcoming appointments from start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filterStartDate = today.toISOString();
  }

  // Get appointments with date filtering
  const allAppointments = await getDashboardAppointments(
    user.id,
    !!isProfessional,
    filterStartDate,
    filterEndDate,
    undefined, // Don't filter by status here
  );

  // Filter for upcoming appointments (confirmed, pending, upcoming statuses)
  // Only apply status filtering if no date range is specified (default behavior)
  const appointmentsForDashboard =
    !startDate && !endDate
      ? allAppointments.filter((appointment) =>
          ['confirmed', 'pending', 'upcoming'].includes(appointment.status),
        )
      : allAppointments;

  // Get stats for the dashboard (always use all appointments for stats)
  const stats = await getDashboardStats(
    user.id,
    !!isProfessional,
    startDate,
    endDate,
  );

  // Get recent conversations for the dashboard (messages should not be filtered by date)
  const recentConversationsResult = await getRecentConversations();
  const recentConversations = recentConversationsResult.success
    ? recentConversationsResult.conversations || []
    : [];

  return (
    <DashboardPageClient
      isProfessional={!!isProfessional}
      upcomingAppointments={appointmentsForDashboard as AppointmentType[]}
      stats={stats}
      recentConversations={recentConversations}
    />
  );
}

// Get stats for the dashboard
export async function getDashboardStats(
  userId: string,
  isProfessional: boolean,
  startDate?: string,
  endDate?: string,
) {
  try {
    // Get all appointments for the user based on role and date range
    const allAppointments = (await getDashboardAppointments(
      userId,
      isProfessional,
      startDate,
      endDate,
      undefined,
    )) as unknown as AppointmentWithServices[];

    // Calculate total revenue (for professionals)
    let totalRevenue = 0;
    if (isProfessional) {
      // For the revenue calculation, we need to get the service prices
      // But based on the logged structure, we don't have prices in the returned data
      // We'll need to query the database directly to get the prices

      const supabase = await createClient();

      // Get all service IDs from appointments
      const serviceIds = allAppointments
        .map((appointment) => appointment.services?.id)
        .filter(Boolean) as string[];

      if (serviceIds.length > 0) {
        // Get prices for these services
        const { data: services } = await supabase
          .from('services')
          .select('id, price')
          .in('id', serviceIds);

        if (services && services.length > 0) {
          // Create a map of service ID to price
          const priceMap = new Map();
          services.forEach((service) => {
            if (service.price) {
              priceMap.set(service.id, service.price);
            }
          });

          // Sum up prices for appointments
          allAppointments.forEach((appointment) => {
            const serviceId = appointment.services?.id;
            if (serviceId && priceMap.has(serviceId)) {
              totalRevenue += priceMap.get(serviceId);
            }
          });
        }
      }
    }

    // Count appointments by status
    const completedAppointments = allAppointments.filter(
      (appointment) => appointment.status === 'completed',
    ).length;

    const cancelledAppointments = allAppointments.filter(
      (appointment) => appointment.status === 'cancelled',
    ).length;

    // Count upcoming appointments
    const upcomingAppointments = allAppointments.filter(
      (appointment) =>
        appointment.status === 'upcoming' ||
        appointment.status === 'confirmed' ||
        appointment.status === 'pending',
    ).length;

    return {
      totalAppointments: allAppointments.length,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue: isProfessional ? totalRevenue : undefined,
      // For demo purposes, include a percentage change
      percentChange: 10,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      totalAppointments: 0,
      upcomingAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      totalRevenue: isProfessional ? 0 : undefined,
      percentChange: 0,
    };
  }
}
