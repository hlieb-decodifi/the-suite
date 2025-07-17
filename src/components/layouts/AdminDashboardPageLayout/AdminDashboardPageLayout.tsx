'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminDashboardPageLayoutClient } from './AdminDashboardPageLayoutClient';
import { DateRangeContextProvider } from './DateRangeContextProvider';
import { formatDateLocalYYYYMMDD } from '@/utils/formatDate';

export type AdminDashboardPageLayoutProps = {
  children: React.ReactNode;
};

// Helper to parse YYYY-MM-DD as local date
function parseLocalDate(dateString?: string) {
  if (!dateString) return undefined;
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

// Convert a local date to UTC ISO string for the start of the day
function getLocalDayStartUTC(dateString?: string) {
  const date = dateString ? parseLocalDate(dateString) : new Date();
  if (!date) return undefined;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// Convert a local date to UTC ISO string for the end of the day
function getLocalDayEndUTC(dateString?: string) {
  const date = dateString ? parseLocalDate(dateString) : new Date();
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export async function getAdminDashboardData({ startDate, endDate }: { startDate?: string | undefined; endDate?: string | undefined }) {
  const adminSupabase = await createAdminClient();
  const now = new Date();
  // Default to last 30 days (inclusive) if no dates provided
  const defaultEnd = formatDateLocalYYYYMMDD(now);
  const defaultStart = formatDateLocalYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  const toDate = endDate ? getLocalDayEndUTC(endDate) : getLocalDayEndUTC(defaultEnd);
  const fromDate = startDate ? getLocalDayStartUTC(startDate) : getLocalDayStartUTC(defaultStart);

  // Bookings
  const { count: totalBookings } = await adminSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
  const { count: newBookings } = await adminSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);
  const { data: bookingsPerDayData } = await adminSupabase
    .from('bookings')
    .select('created_at')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);
  const bookingsPerDay: Record<string, number> = {};
  (bookingsPerDayData as { created_at: string }[] | undefined)?.forEach(({ created_at }) => {
    const day = created_at.slice(0, 10);
    bookingsPerDay[day] = (bookingsPerDay[day] || 0) + 1;
  });

  // Clients
  const { count: totalClients } = await adminSupabase
    .from('client_profiles')
    .select('*', { count: 'exact', head: true });
  const { count: newClients } = await adminSupabase
    .from('client_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Professionals
  const { count: totalProfessionals } = await adminSupabase
    .from('professional_profiles')
    .select('*', { count: 'exact', head: true });
  const { count: newProfessionals } = await adminSupabase
    .from('professional_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Messages (chats)
  const { count: totalChats } = await adminSupabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });
  const { count: newChats } = await adminSupabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Refunds
  const { count: totalRefunds } = await adminSupabase
    .from('refunds')
    .select('*', { count: 'exact', head: true });
  const { count: newRefunds } = await adminSupabase
    .from('refunds')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  return {
    totalBookings: totalBookings || 0,
    newBookings: newBookings || 0,
    bookingsPerDay,
    totalClients: totalClients || 0,
    newClients: newClients || 0,
    totalProfessionals: totalProfessionals || 0,
    newProfessionals: newProfessionals || 0,
    totalChats: totalChats || 0,
    newChats: newChats || 0,
    totalRefunds: totalRefunds || 0,
    newRefunds: newRefunds || 0,
  };
}

export async function AdminDashboardPageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
  if (!isAdmin) redirect('/');

  // Get date range from headers (for initial dashboard data fetch)
  const rawHeaders = await headers();
  const xNextUrl = rawHeaders.get('x-next-url');
  const search = xNextUrl?.split('?')[1] || '';
  const searchParams = new URLSearchParams(search);
  const start: string | undefined = searchParams.get('start') || undefined;
  const end: string | undefined = searchParams.get('end') || undefined;

  // Fetch dashboard data for the current date range
  const dashboardData = await getAdminDashboardData({ startDate: start, endDate: end });

  return (
    <DateRangeContextProvider initialStart={start} initialEnd={end}>
      <AdminDashboardPageLayoutClient user={user} dashboardData={dashboardData}>
        {children}
      </AdminDashboardPageLayoutClient>
    </DateRangeContextProvider>
  );
} 