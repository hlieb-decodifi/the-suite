


import { AdminAppointmentsPageClient } from './AdminAppointmentsPageClient';
import { createAdminClient } from '@/lib/supabase/server';

export async function getAdminAppointmentsData({ start, end }: { start?: string | undefined; end?: string | undefined }) {
  const adminSupabase = await createAdminClient();
  let appointmentsQuery = adminSupabase
    .from('appointments')
    .select('id, status, start_time, end_time, booking_id');
  if (start) appointmentsQuery = appointmentsQuery.gte('start_time', start);
  if (end) appointmentsQuery = appointmentsQuery.lte('end_time', end);
  const { data: rawAppointments, error: appointmentsError } = await appointmentsQuery;
  if (appointmentsError) throw new Error(appointmentsError.message);

  // Fetch bookings for referenced appointments
  const bookingIds = Array.isArray(rawAppointments) ? rawAppointments.map((a: unknown) => (a as { booking_id?: string }).booking_id).filter((id): id is string => !!id) : [];
  let bookingsData: Array<{ id: string; client_id?: string; professional_profile_id?: string; service_id?: string }> = [];
  if (bookingIds.length > 0) {
    // Filter out undefined bookingIds for .in() query
    const filteredBookingIds = bookingIds.filter((id): id is string => !!id);
    // Fetch bookings
    const { data: bookingsRaw, error: bookingsError } = await adminSupabase
      .from('bookings')
      .select('id, client_id, professional_profile_id')
      .in('id', filteredBookingIds);
    if (bookingsError) throw new Error(bookingsError.message);
    bookingsData = bookingsRaw || [];

    // Fetch booking_services to get service_id for each booking
    const { data: bookingServicesData, error: bookingServicesError } = await adminSupabase
      .from('booking_services')
      .select('booking_id, service_id')
      .in('booking_id', filteredBookingIds);
    if (bookingServicesError) throw new Error(bookingServicesError.message);

    // Attach service_id to each booking
    bookingsData = bookingsData.map((booking) => {
      const b = booking as { id: string };
      const bookingService = Array.isArray(bookingServicesData)
        ? bookingServicesData.find((bs) => (bs as { booking_id: string }).booking_id === b.id)
        : undefined;
      const service_id = (bookingService as { service_id?: string })?.service_id;
      if (service_id) {
        return {
          ...b,
          service_id,
        };
      }
      return b;
    });
  }

  // Fetch services for referenced bookings
  const serviceIds = bookingsData.length > 0 ? bookingsData.map((b: unknown) => (b as { service_id?: string }).service_id).filter((id): id is string => !!id) : [];
  let servicesData: Array<{ id: string; name: string }> = [];
  if (serviceIds.length > 0) {
    const { data, error } = await adminSupabase
      .from('services')
      .select('id, name')
      .in('id', serviceIds);
    if (error) throw new Error(error.message);
    servicesData = data || [];
  }

  // Fetch clients (users with role 'client')
  const { data: clientsData, error: clientsError } = await adminSupabase
    .from('users')
    .select('id, first_name, last_name, role_id, roles(name)')
    .eq('roles.name', 'client');
  if (clientsError) throw new Error(clientsError.message);

  // Fetch professional_profiles by professional_profile_id from bookings
  const professionalProfileIds = bookingsData.length > 0 ? bookingsData.map((b: unknown) => (b as { professional_profile_id?: string }).professional_profile_id).filter((id): id is string => !!id) : [];
  let professionalProfilesData: Array<{ id: string; user_id: string }> = [];
  if (professionalProfileIds.length > 0) {
    const { data, error } = await adminSupabase
      .from('professional_profiles')
      .select('id, user_id')
      .in('id', professionalProfileIds);
    if (error) throw new Error(error.message);
    professionalProfilesData = data || [];
  }

  // Fetch users for professionals using user_id from professional_profiles
  const professionalUserIds = professionalProfilesData.length > 0 ? professionalProfilesData.map((p: unknown) => (p as { user_id?: string }).user_id).filter((id): id is string => !!id) : [];
  let professionalsData: Array<{ id: string; first_name?: string; last_name?: string }> = [];
  if (professionalUserIds.length > 0) {
    const { data, error } = await adminSupabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', professionalUserIds);
    if (error) throw new Error(error.message);
    professionalsData = data || [];
  }

  // Merge appointment with booking, client, professional, and service info
  const appointments = Array.isArray(rawAppointments)
    ? rawAppointments.map((a: unknown) => {
        const appointment = a as { id: string; start_time: string; end_time: string; booking_id?: string; status: string };
        const booking = bookingsData.find((b) => b.id === appointment.booking_id);
        const client = clientsData?.find((c) => c.id === booking?.client_id);
        // Find professional_profile for this booking
        const professionalProfile = professionalProfilesData?.find((pp) => pp.id === booking?.professional_profile_id);
        // Find user for this professional_profile
        const professional = professionalsData?.find((p) => p.id === professionalProfile?.user_id);
        const service = servicesData.find((s) => s.id === booking?.service_id);
        return {
          id: appointment.id,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          client: client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '',
          professional: professional ? [professional.first_name, professional.last_name].filter(Boolean).join(' ') : '',
          service: service ? service.name : '',
          status: appointment.status,
        };
      })
    : [];

  // Only include clients from the appointments results
  const clientNames = appointments
    .map(app => app.client)
    .filter((name, idx, arr) => name && arr.indexOf(name) === idx);

  // Only include professionals from the appointments results
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
