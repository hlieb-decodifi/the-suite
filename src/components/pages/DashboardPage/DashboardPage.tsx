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
    actualPaymentAmount?: number;
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
    'upcoming', // Filter by upcoming status directly in the query
  );

  // No need for additional filtering since we're getting upcoming appointments directly
  const appointmentsForDashboard = allAppointments;

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

  // Get recent refunds for the dashboard (latest 3)
  const recentRefunds = await getDashboardRefunds(
    user.id,
    !!isProfessional,
    undefined,
    undefined,
    3, // limit to 3 for dashboard widget
  );

  return (
    <DashboardPageClient
      isProfessional={!!isProfessional}
      upcomingAppointments={appointmentsForDashboard as AppointmentType[]}
      stats={stats}
      recentConversations={recentConversations}
      recentRefunds={recentRefunds}
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
      // Use actual payment amounts from the appointment data
      allAppointments.forEach((appointment) => {
        // Use actual payment amount if available, otherwise fallback to service price
        const appointmentWithPayment = appointment as AppointmentWithServices;
        const paymentAmount =
          appointmentWithPayment.services?.actualPaymentAmount;
        if (paymentAmount) {
          totalRevenue += paymentAmount;
        }
      });
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

// Get refunds for the dashboard
export async function getDashboardRefunds(
  userId: string,
  isProfessional: boolean,
  startDate?: string,
  endDate?: string,
  limit?: number,
) {
  try {
    const supabase = await createClient();

    // First get refunds data with basic info
    let refundsQuery = supabase.from('refunds').select(`
        id,
        reason,
        requested_amount,
        original_amount,
        refund_amount,
        status,
        created_at,
        updated_at,
        appointment_id,
        client_id,
        professional_id
      `);

    // Filter based on user role
    if (isProfessional) {
      refundsQuery = refundsQuery.eq('professional_id', userId);
    } else {
      refundsQuery = refundsQuery.eq('client_id', userId);
    }

    // Apply date filters if provided
    if (startDate) {
      refundsQuery = refundsQuery.gte('created_at', startDate);
    }

    if (endDate) {
      refundsQuery = refundsQuery.lte('created_at', endDate);
    }

    // Order by created_at descending and apply limit if specified
    refundsQuery = refundsQuery.order('created_at', { ascending: false });

    if (limit) {
      refundsQuery = refundsQuery.limit(limit);
    }

    const { data: refundsData, error: refundsError } = await refundsQuery;

    if (refundsError) {
      console.error('Error fetching refunds:', refundsError);
      return [];
    }

    if (!refundsData || refundsData.length === 0) {
      return [];
    }

    // Get additional data for appointments and user names
    const appointmentIds = refundsData.map((r) => r.appointment_id);
    const clientIds = refundsData.map((r) => r.client_id);
    const professionalIds = refundsData.map((r) => r.professional_id);

    // Fetch appointments data
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(
        `
        id,
        start_time,
        end_time,
        bookings!inner(
          id,
          booking_services(
            services(name)
          )
        )
      `,
      )
      .in('id', appointmentIds);

    // Fetch user data
    const { data: usersData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', [...clientIds, ...professionalIds]);

    // Create lookup maps
    const appointmentsMap = new Map(
      appointmentsData?.map((a) => [a.id, a]) || [],
    );
    const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);

    // Transform the data to match the expected format
    const transformedRefunds = refundsData.map((refund) => {
      const appointment = appointmentsMap.get(refund.appointment_id);
      const clientUser = usersMap.get(refund.client_id);
      const professionalUser = usersMap.get(refund.professional_id);

      // Get client/professional name
      const clientName = clientUser
        ? `${clientUser.first_name} ${clientUser.last_name}`.trim()
        : 'Client';

      const professionalName = professionalUser
        ? `${professionalUser.first_name} ${professionalUser.last_name}`.trim()
        : 'Professional';

      // Get service name from first booking service
      const serviceName =
        appointment?.bookings?.booking_services?.[0]?.services?.name ||
        'Service';

      // Create appointment date/time from start_time
      const appointmentDate = appointment?.start_time
        ? new Date(appointment.start_time)
        : new Date();

      return {
        id: refund.id,
        appointmentId: refund.appointment_id,
        reason: refund.reason,
        requestedAmount: refund.requested_amount,
        originalAmount: refund.original_amount,
        refundAmount: refund.refund_amount,
        status: refund.status,
        createdAt: refund.created_at,
        updatedAt: refund.updated_at,
        serviceName,
        clientName,
        professionalName,
        appointmentDate: appointmentDate.toISOString(),
      };
    });

    return transformedRefunds;
  } catch (error) {
    console.error('Error in getDashboardRefunds:', error);
    return [];
  }
}
