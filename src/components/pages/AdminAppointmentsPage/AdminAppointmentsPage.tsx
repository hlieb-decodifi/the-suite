import { AdminAppointmentsPageClient } from './AdminAppointmentsPageClient';
import { createAdminClient } from '@/lib/supabase/server';
import { applyDateRangeFilter } from '@/utils/dateFilter';
import { requireAdminUser } from '@/server/domains/admin/actions';

export async function getAdminAppointmentsData({
  start,
  end,
}: {
  start?: string | undefined;
  end?: string | undefined;
}) {
  // Check if current user is admin
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    throw new Error('Admin access required');
  }

  const adminSupabase = createAdminClient();
  // Build the query with nested selects
  let appointmentsQuery = adminSupabase.from('appointments').select(`
      id,
      status,
      start_time,
      end_time,
      booking:bookings (
        id,
        client:users (
          id,
          first_name,
          last_name
        ),
        professional_profile:professional_profiles (
          id,
          user:users (
            id,
            first_name,
            last_name
          )
        ),
        booking_services (
          service:services (
            id,
            name
          )
        )
      )
    `);

  // Apply inclusive date range filter
  appointmentsQuery = applyDateRangeFilter(
    appointmentsQuery,
    'start_time',
    start,
    end,
  );

  const { data: rawAppointments, error: appointmentsError } =
    await appointmentsQuery;
  if (appointmentsError) throw new Error(appointmentsError.message);

  // Map the nested data to the UI shape
  // Define types for the nested Supabase result
  type SupabaseUser = { id: string; first_name: string; last_name: string };
  type SupabaseService = { id: string; name: string };
  type SupabaseBookingService = { service: SupabaseService | null };
  type SupabaseProfessionalProfile = { id: string; user: SupabaseUser | null };
  type SupabaseBooking = {
    id: string;
    client: SupabaseUser | null;
    professional_profile: SupabaseProfessionalProfile | null;
    booking_services: SupabaseBookingService[];
  };
  type AppointmentRow = {
    id: string;
    status: string;
    start_time: string;
    end_time: string;
    booking: SupabaseBooking | null;
  };

  const appointments = Array.isArray(rawAppointments)
    ? (rawAppointments as AppointmentRow[]).map((a) => {
        const booking = a.booking;
        const client = booking?.client;
        const professionalProfile = booking?.professional_profile;
        const professional = professionalProfile?.user;
        // booking_services is an array, but we only display the first service name (if any)
        const service =
          Array.isArray(booking?.booking_services) &&
          booking.booking_services.length > 0
            ? booking.booking_services[0]?.service
            : undefined;
        return {
          id: a.id,
          startTime: a.start_time,
          endTime: a.end_time,
          client: client
            ? [client.first_name, client.last_name].filter(Boolean).join(' ')
            : '',
          professional: professional
            ? [professional.first_name, professional.last_name]
                .filter(Boolean)
                .join(' ')
            : '',
          service: service ? service.name : '',
          status: a.status,
        };
      })
    : [];

  // Only include unique clients from the appointments results
  const clientNames = appointments
    .map((app) => app.client)
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  // Only include unique professionals from the appointments results
  const professionalNames = appointments
    .map((app) => app.professional)
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  return {
    appointments,
    clients: clientNames,
    professionals: professionalNames,
  };
}

export type AdminAppointmentsPageProps = {
  searchParams?: Promise<Record<string, unknown>>;
};

export default async function AdminAppointmentsPage({
  searchParams,
}: AdminAppointmentsPageProps) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const { appointments, clients, professionals } =
    await getAdminAppointmentsData({ start, end });
  return (
    <AdminAppointmentsPageClient
      appointments={appointments}
      clients={clients}
      professionals={professionals}
    />
  );
}
