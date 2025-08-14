


import { AdminAppointmentsPageClient } from './AdminAppointmentsPageClient';
import { createAdminClient } from '@/lib/supabase/server';


export async function getAdminAppointmentsData({ start, end }: { start?: string | undefined; end?: string | undefined }) {
  const adminSupabase = await createAdminClient();
  // Build the query with nested selects
  let appointmentsQuery = adminSupabase
    .from('appointments')
    .select(`
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
  if (start) appointmentsQuery = appointmentsQuery.gte('start_time', start);
  if (end) appointmentsQuery = appointmentsQuery.lte('end_time', end);
  const { data: rawAppointments, error: appointmentsError } = await appointmentsQuery;
  if (appointmentsError) throw new Error(appointmentsError.message);

  // Map the nested data to the UI shape
  const appointments = Array.isArray(rawAppointments)
    ? rawAppointments.map((a: any) => {
        const booking = a.booking;
        const client = booking?.client;
        const professionalProfile = booking?.professional_profile;
        const professional = professionalProfile?.user;
        // booking_services is an array, but we only display the first service name (if any)
        const service = Array.isArray(booking?.booking_services) && booking.booking_services.length > 0
          ? booking.booking_services[0]?.service
          : undefined;
        return {
          id: a.id,
          startTime: a.start_time,
          endTime: a.end_time,
          client: client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '',
          professional: professional ? [professional.first_name, professional.last_name].filter(Boolean).join(' ') : '',
          service: service ? service.name : '',
          status: a.status,
        };
      })
    : [];

  // Only include unique clients from the appointments results
  const clientNames = appointments
    .map(app => app.client)
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  // Only include unique professionals from the appointments results
  const professionalNames = appointments
    .map(app => app.professional)
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

export default async function AdminAppointmentsPage({ searchParams }: AdminAppointmentsPageProps) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const { appointments, clients, professionals } = await getAdminAppointmentsData({ start, end });
  return <AdminAppointmentsPageClient appointments={appointments} clients={clients} professionals={professionals} />;
}
