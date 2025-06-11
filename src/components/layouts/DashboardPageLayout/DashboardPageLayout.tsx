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
        last_name,
        role_id,
        roles(name)
      `,
      )
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error(
        `Error fetching user data: ${userError?.message || 'User not found'}`,
      );
    }

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

    // Get unread messages count
    const unreadMessagesCount = await getUnreadMessagesCount(userId);

    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roleName: userData.roles?.name || 'User',
      isProfessional: !!isProfessional,
      email,
      appointmentCounts,
      unreadMessagesCount,
    };
  } catch (error) {
    console.error('Error in getUserDashboardData:', error);
    throw new Error('Failed to get user dashboard data');
  }
}

// Get appointments for the dashboard
export async function getDashboardAppointments(
  userId: string,
  isProfessional: boolean,
  startDateIso?: string,
  endDateIso?: string,
  status?: string,
) {
  try {
    const supabase = await createClient();

    // First, verify the user exists in our users table and check auth status
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log('Auth user in getDashboardAppointments:', authUser?.id, 'Expected userId:', userId);
    
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role_id, roles(name)')
      .eq('id', userId)
      .single();
    
    console.log('Database user:', dbUser, 'Error:', dbUserError);
    
    if (dbUserError || !dbUser) {
      console.error('User not found in database or error fetching user:', dbUserError);
      return [];
    }

    // Get professional profile ID if user is a professional
    let professionalProfileId: string | null = null;
    if (isProfessional) {
      const { data: profile, error: profileError } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching professional profile for appointments:', profileError);
        // If profile doesn't exist but user is professional, try to create it
        if (profileError.code === 'PGRST116') {
          console.log('Professional profile not found, attempting to create one for user:', userId);
          
          const { data: newProfile, error: createError } = await supabase
            .from('professional_profiles')
            .insert({ user_id: userId })
            .select('id')
            .single();
          
          if (createError) {
            console.error('Error creating professional profile:', createError);
            return []; // Return empty array if we can't create profile
          }
          
          if (newProfile) {
            professionalProfileId = newProfile.id;
            console.log('Created new professional profile with ID:', newProfile.id);
          }
        } else {
          return []; // Return empty array for other errors
        }
      } else {
        professionalProfileId = profile?.id || null;
      }
    }

    // First, get the bookings that belong to this user
    let bookingsQuery = supabase.from('bookings').select('id');

    // Filter based on user role
    if (isProfessional && professionalProfileId) {
      bookingsQuery = bookingsQuery.eq(
        'professional_profile_id',
        professionalProfileId,
      );
    } else {
      // For clients, ensure they have a client profile
      const { error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (clientError) {
        console.error('Error fetching client profile for appointments:', clientError);
        // If profile doesn't exist but user is client, try to create it
        if (clientError.code === 'PGRST116') {
          console.log('Client profile not found, attempting to create one for user:', userId);
          
          const { error: createClientError } = await supabase
            .from('client_profiles')
            .insert({ user_id: userId })
            .select('id')
            .single();
          
          if (createClientError) {
            console.error('Error creating client profile:', createClientError);
            return []; // Return empty array if we can't create profile
          }
          
          console.log('Created new client profile for user:', userId);
        } else {
          return []; // Return empty array for other errors
        }
      }
      
      bookingsQuery = bookingsQuery.eq('client_id', userId);
    }

    // Apply status filter if provided
    if (status && status !== 'all') {
      bookingsQuery = bookingsQuery.eq('status', status);
    }

    const { data: bookingsData, error: bookingsError } = await bookingsQuery;

    if (bookingsError !== null) {
      console.error('Error fetching bookings:', bookingsError);
      return [];
    }

    // If no bookings, return empty array
    if (!bookingsData || bookingsData.length === 0) {
      return [];
    }

    // Get all booking IDs
    const bookingIds = bookingsData.map((booking) => booking.id);

    // Now fetch appointments with related data
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_id,
        date,
        start_time,
        end_time,
        status,
        created_at,
        updated_at,
        bookings!appointments_booking_id_fkey(
          id,
          client_id,
          professional_profile_id,
          status,
          notes,
          created_at,
          updated_at,
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
          clients:client_id(
            id,
            first_name,
            last_name
          ),
          professionals:professional_profile_id(
            id,
            user_id,
            users:user_id(
              id,
              first_name,
              last_name
            )
          )
        )
      `,
      )
      .in('booking_id', bookingIds);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return [];
    }

    // Transform the data to match the expected format for the UI
    const transformedAppointments = appointmentsData
      .map((appointment) => {
        const booking = appointment.bookings;
        if (!booking) return null;

        // Combine date and time into ISO strings for start_time and end_time
        const startDate = new Date(appointment.date);
        const endDate = new Date(appointment.date);

        // Parse time strings (HH:MM:SS) and set hours/minutes
        const startTimeParts = appointment.start_time.split(':').map(Number);
        const endTimeParts = appointment.end_time.split(':').map(Number);

        const startHours = startTimeParts[0] || 0;
        const startMinutes = startTimeParts[1] || 0;
        const endHours = endTimeParts[0] || 0;
        const endMinutes = endTimeParts[1] || 0;

        startDate.setHours(startHours, startMinutes, 0);
        endDate.setHours(endHours, endMinutes, 0);

        // Get service information from the first booking service (if available)
        const service = booking.booking_services?.[0]?.services || null;

        return {
          id: appointment.id,
          booking_id: booking.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: appointment.status,
          location: 'Location not specified', // Add actual location if available
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

    // Apply date range filters (if provided) on the transformed data
    let filteredAppointments = transformedAppointments;

    if (startDateIso) {
      const startDate = new Date(startDateIso);
      filteredAppointments = filteredAppointments.filter(
        (appointment) => new Date(appointment.start_time) >= startDate,
      );
    }

    if (endDateIso) {
      const endDate = new Date(endDateIso);
      filteredAppointments = filteredAppointments.filter(
        (appointment) => new Date(appointment.start_time) <= endDate,
      );
    }

    // Sort by start time (ascending)
    filteredAppointments.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    return filteredAppointments;
  } catch (error) {
    console.error('Error in getDashboardAppointments:', error);
    return []; // Return empty array instead of throwing
  }
}

// Get unread messages count
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();

    // Get all conversations for this user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`);

    if (conversationsError || !conversations) {
      console.error('Error fetching conversations for unread count:', conversationsError);
      return 0;
    }

    if (conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map(conv => conv.id);

    // Count unread messages where sender is not the current user
    const { count, error: messagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (messagesError) {
      console.error('Error counting unread messages:', messagesError);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadMessagesCount:', error);
    return 0;
  }
}
