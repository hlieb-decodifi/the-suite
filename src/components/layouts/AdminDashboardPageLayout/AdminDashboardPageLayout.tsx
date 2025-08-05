'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminDashboardPageLayoutClient } from './AdminDashboardPageLayoutClient';
import { DateRangeContextProvider } from './DateRangeContextProvider';

export type AdminDashboardPageLayoutProps = {
  children: React.ReactNode;
};

export type DashboardData = {
  totalBookings: number;
  newBookings: number;
  bookingsPerDay: Record<string, number>;
  totalClients: number;
  newClients: number;
  totalProfessionals: number;
  newProfessionals: number;
  totalChats: number;
  newChats: number;
  totalRefunds: number;
  newRefunds: number;
};

// Replace getAdminDashboardData to use the new RPC function
export async function getAdminDashboardData({ startDate, endDate }: { startDate?: string | undefined; endDate?: string | undefined }): Promise<DashboardData> {
  const adminSupabase = await createAdminClient();
  const params: { start_date?: string; end_date?: string } = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const { data, error } = await adminSupabase.rpc('get_admin_dashboard_data', params);
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No dashboard data returned');
  (data as DashboardData).totalRefunds = 0;
  (data as DashboardData).newRefunds = 0;
  return data as DashboardData;
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