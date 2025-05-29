'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardPageClient } from './DashboardPageClient';
import { getDashboardAppointments } from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';
import { AppointmentType } from '@/components/common/AppointmentItem';

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

export async function DashboardPage() {
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

  // Get upcoming appointments for the dashboard
  const currentDate = new Date().toISOString();
  const upcomingAppointments = await getDashboardAppointments(
    user.id,
    !!isProfessional,
    currentDate,
    undefined,
    'confirmed',
  );

  // Pass all upcoming appointments to the dashboard
  const appointmentsForDashboard = upcomingAppointments;

  // Get stats for the dashboard
  const stats = await getDashboardStats(user.id, !!isProfessional);

  return (
    <DashboardPageClient
      isProfessional={!!isProfessional}
      upcomingAppointments={appointmentsForDashboard as AppointmentType[]}
      stats={stats}
    />
  );
}

// Get stats for the dashboard
export async function getDashboardStats(
  userId: string,
  isProfessional: boolean,
) {
  try {
    // Get all appointments for the user based on role
    const allAppointments = (await getDashboardAppointments(
      userId,
      isProfessional,
      undefined,
      undefined,
      undefined,
    )) as unknown as AppointmentWithServices[];

    // Log structure to debug
    console.log('First appointment structure:', allAppointments[0]);

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
