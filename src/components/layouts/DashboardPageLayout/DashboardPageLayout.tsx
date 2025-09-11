'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardPageLayoutClient } from '@/components/layouts/DashboardPageLayout/DashboardPageLayoutClient';
import { getAppointmentsCountByStatus } from '@/server/domains/appointments/actions';

export type UserDashboardData = {
  id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  isProfessional: boolean;
  email?: string | undefined;
  appointmentCounts?: {
    upcoming: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  unreadMessagesCount?: number;
  unreadSupportMessagesCount?: number;
};

export type DashboardPageLayoutProps = {
  children: React.ReactNode;
};

export async function DashboardPageLayout({
  children,
}: DashboardPageLayoutProps) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user data on the server
  const userData = await getUserDashboardData(user.id);

  return (
    <div className="w-full mx-auto">
      <DashboardPageLayoutClient user={user} userData={userData}>
        {children}
      </DashboardPageLayoutClient>
    </div>
  );
}

// Server actions for this layout
export async function getUserDashboardData(
  userId: string,
): Promise<UserDashboardData> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Fetch user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        first_name,
        last_name
      `,
      )
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error(
        `Error fetching user data: ${userError?.message || 'User not found'}`,
      );
    }

    // Fetch user role separately
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    // Get user's email from the current authenticated user
    let email: string | undefined;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.id === userId) {
      // If requesting data for the current user, get email from authenticated user
      email = authUser.email;
    }

    // Check if user is a professional
    const { data: isProfessional, error: roleError } = await supabase.rpc(
      'is_professional',
      { user_uuid: userId },
    );

    if (roleError) {
      console.error('Error checking professional status:', roleError);
    }

    // Get appointment counts
    const appointmentCounts = await getAppointmentsCountByStatus(userId);

    // Get unread messages count for general conversations
    const unreadMessagesCount = await getUnreadMessagesCount(userId);

    // Get unread messages count for support requests
    const unreadSupportMessagesCount =
      await getUnreadSupportMessagesCount(userId);

    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roleName: userRoleData?.role || 'User',
      isProfessional: !!isProfessional,
      email,
      appointmentCounts,
      unreadMessagesCount,
      unreadSupportMessagesCount,
    };
  } catch (error) {
    console.error('Error in getUserDashboardData:', error);
    throw new Error('Failed to get user dashboard data');
  }
}

type BookingPayment = {
  amount: number;
  tip_amount: number | null;
  service_fee: number | null;
};

type BookingService = {
  id: string;
  service_id: string;
  price: number;
  duration: number;
  services: {
    name: string;
    description: string | null;
  } | null;
};

type AppointmentQueryResult = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  computed_status: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    booking_services: BookingService[] | BookingService | null;
    booking_payments: BookingPayment[] | BookingPayment | null;
    professionals: {
      id: string;
      user_id: string;
      users: {
        id: string;
        first_name: string | null;
        last_name: string | null;
      } | null;
    };
    clients: {
      id: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
  };
};

export async function getDashboardAppointments(
  userId: string,
  isProfessional: boolean,
  startDateIso?: string,
  endDateIso?: string,
  status?: string,
) {
  try {
    const supabase = await createClient();

    // Start building the query using appointments_with_status view
    let query = supabase.from('appointments_with_status').select(
      `
        id,
        start_time,
        end_time,
        status,
        computed_status,
        bookings!inner(
          id,
          client_id,
          professional_profile_id,
          notes,
          created_at,
          updated_at,
          booking_services(
            id,
            service_id,
            price,
            duration,
            services(
              name,
              description
            )
          ),
          booking_payments(
            amount,
            tip_amount,
            service_fee
          ),
          professionals:professional_profiles!inner(
            id,
            user_id,
            users(
              id,
              first_name,
              last_name
            )
          ),
          clients:users!client_id(
            id,
            first_name,
            last_name
          )
        )
      `,
    );

    // Add filters based on user role
    if (isProfessional) {
      query = query.eq('bookings.professional_profiles.user_id', userId);
    } else {
      query = query.eq('bookings.client_id', userId);
    }

    // Add date range filters if provided
    if (startDateIso) {
      const startDate = new Date(startDateIso);
      startDate.setUTCHours(0, 0, 0, 0);
      query = query.gte('start_time', startDate.toISOString());
    }

    if (endDateIso) {
      const endDate = new Date(endDateIso);
      endDate.setUTCHours(23, 59, 59, 999);
      query = query.lte('start_time', endDate.toISOString());
    }

    // Add status filter if provided - use computed_status instead of status
    if (status) {
      query = query.eq('computed_status', status);
    }

    // Execute the query
    const { data: appointmentsData, error } = await query;

    if (error || !appointmentsData) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    // Create a Map for quick booking lookups
    const bookingsMap = new Map(
      (appointmentsData as AppointmentQueryResult[]).map((appointment) => [
        appointment.bookings.id,
        appointment.bookings,
      ]),
    );

    // Transform the data to match the expected format for the UI
    const transformedAppointments = (
      appointmentsData as AppointmentQueryResult[]
    )
      .map((appointment) => {
        const booking = bookingsMap.get(appointment.bookings.id);
        if (!booking) return null;

        // Get all booking services
        const bookingServices = Array.isArray(booking.booking_services)
          ? booking.booking_services
          : booking.booking_services
            ? [booking.booking_services]
            : [];

        // Get booking payment
        const bookingPayment = Array.isArray(booking.booking_payments)
          ? booking.booking_payments[0]
          : booking.booking_payments;

        // Calculate total amount from booking_services
        const servicesTotal = bookingServices.reduce(
          (sum, service) => sum + (service?.price || 0),
          0,
        );

        // Get service fee and tip from booking_payments
        const serviceFee = bookingPayment?.service_fee || 0;
        const tipAmount = bookingPayment?.tip_amount || 0;

        // Calculate total amount
        const totalAmount = servicesTotal + serviceFee + tipAmount;

        // Get the first service details
        const firstService = bookingServices[0];

        const service = firstService
          ? {
              id: firstService.service_id,
              name: firstService.services?.name || 'Unnamed Service',
              description: firstService.services?.description,
              price: servicesTotal, // Use total of all services
              duration: firstService.duration,
              totalPrice: servicesTotal,
              totalDuration: bookingServices.reduce(
                (sum, bs) => sum + (bs.duration || 0),
                0,
              ),
              totalWithServiceFee: totalAmount,
              hasAdditionalServices: bookingServices.length > 1,
              additionalServicesCount: bookingServices.length - 1,
              allServices: bookingServices.map((bs) => ({
                id: bs.service_id,
                name: bs.services?.name || 'Unnamed Service',
                description: bs.services?.description || '',
                price: bs.price,
                duration: bs.duration,
              })),
              actualPaymentAmount: totalAmount,
            }
          : null;

        return {
          id: appointment.id,
          booking_id: booking.id,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.computed_status,
          computed_status: appointment.computed_status,
          location: 'Location not specified',
          notes: booking.notes,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          services: service,
          professionals: {
            id: booking.professional_profile_id,
            user_id: booking.professionals?.user_id,
            users: booking.professionals?.users,
          },
          clients: {
            id: booking.client_id,
            user_id: booking.client_id,
            users: booking.clients,
          },
        };
      })
      .filter(
        (appointment): appointment is NonNullable<typeof appointment> =>
          appointment !== null,
      );

    // Sort by start time (descending - most recent first)
    transformedAppointments.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );

    return transformedAppointments;
  } catch (error) {
    console.error('Error in getDashboardAppointments:', error);
    return [];
  }
}

// Get unread messages count
// Get unread support request messages count
export async function getUnreadSupportMessagesCount(
  userId: string,
): Promise<number> {
  try {
    const supabase = await createClient();

    // Get support request conversations for this user (not general)
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`)
      .neq('purpose', 'general');

    if (conversationsError || !conversations) {
      console.error(
        'Error fetching support conversations for unread count:',
        conversationsError,
      );
      return 0;
    }

    if (conversations.length === 0) {
      return 0;
    }

    // Count unread support messages for each conversation using the new RPC function
    let totalUnreadCount = 0;

    for (const conversation of conversations) {
      const { data: unreadCount, error: countError } = await supabase.rpc(
        'get_unread_message_count',
        {
          p_conversation_id: conversation.id,
          p_user_id: userId,
        },
      );

      if (countError) {
        console.error(
          'Error counting unread support messages for conversation:',
          countError,
        );
        continue; // Skip this conversation but continue counting others
      }

      totalUnreadCount += unreadCount || 0;
    }

    return totalUnreadCount;
  } catch (error) {
    console.error('Error in getUnreadSupportMessagesCount:', error);
    return 0;
  }
}

// Get unread general messages count
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();

    // Get conversations for this user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .eq('purpose', 'general')
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`);

    if (conversationsError || !conversations) {
      console.error(
        'Error fetching conversations for unread count:',
        conversationsError,
      );
      return 0;
    }

    if (conversations.length === 0) {
      return 0;
    }

    // Count unread messages for each conversation using the new RPC function
    let totalUnreadCount = 0;

    for (const conversation of conversations) {
      const { data: unreadCount, error: countError } = await supabase.rpc(
        'get_unread_message_count',
        {
          p_conversation_id: conversation.id,
          p_user_id: userId,
        },
      );

      if (countError) {
        console.error(
          'Error counting unread messages for conversation:',
          countError,
        );
        continue; // Skip this conversation but continue counting others
      }

      totalUnreadCount += unreadCount || 0;
    }

    return totalUnreadCount;
  } catch (error) {
    console.error('Error in getUnreadMessagesCount:', error);
    return 0;
  }
}
