
'use server';
import React from 'react';

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


// Fetch dashboard overview data (RPC)
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

// Fetch appointments data (direct query)
export async function getAdminAppointmentsData({
  startDate,
  endDate,
  client,
  professional,
  sortDirection = 'asc',
}: {
  startDate?: string;
  endDate?: string;
  client?: string;
  professional?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const adminSupabase = await createAdminClient();
  let query = adminSupabase.from('appointments').select('*');
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (client) query = query.eq('client', client);
  if (professional) query = query.eq('professional', professional);
  query = query.order('date', { ascending: sortDirection === 'asc' });
  query = query.order('time', { ascending: sortDirection === 'asc' });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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

  // Get active tab from pathname
  const pathname = xNextUrl?.split('?')[0] || '/admin';
  function getActiveTabFromPath(path: string): string {
    if (path === '/admin' || path === '/admin/') return 'overview';
    if (path.includes('/admin/appointments')) return 'appointments';
    if (path.includes('/admin/clients')) return 'clients';
    if (path.includes('/admin/professionals')) return 'professionals';
    if (path.includes('/admin/refunds')) return 'refunds';
    if (path.includes('/admin/messages')) return 'messages';
    if (path.includes('/admin/admins')) return 'admins';
    if (path.includes('/admin/legal')) return 'legal';
    return 'overview';
  }
  const activeTab = getActiveTabFromPath(pathname);

  // Conditionally fetch dashboardData
  let dashboardData: DashboardData | undefined = undefined;
  const tabProps: {} = {};
  if (activeTab === 'overview') {
    dashboardData = await getAdminDashboardData({ startDate: start, endDate: end });
  }

  // Pass tabProps to children if needed
  return (
    <DateRangeContextProvider initialStart={start} initialEnd={end}>
      <AdminDashboardPageLayoutClient user={user} dashboardData={dashboardData}>
        {React.cloneElement(children as React.ReactElement, { ...tabProps })}
      </AdminDashboardPageLayoutClient>
    </DateRangeContextProvider>
  );
}