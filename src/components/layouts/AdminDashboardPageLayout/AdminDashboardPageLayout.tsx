'use server';
import React from 'react';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/server/domains/admin/actions';
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
  totalSupportRequests: number;
  newSupportRequests: number;
};

// Fetch dashboard overview data (RPC)
type DashboardDataRpc = {
  totalBookings?: number;
  newBookings?: number;
  bookingsPerDay?: Record<string, number>;
  totalClients?: number;
  newClients?: number;
  totalProfessionals?: number;
  newProfessionals?: number;
  totalChats?: number;
  newChats?: number;
  totalSupportRequests?: number;
  newSupportRequests?: number;
};

export async function getAdminDashboardData({
  startDate,
  endDate,
}: {
  startDate?: string | undefined;
  endDate?: string | undefined;
}): Promise<DashboardData> {
  // Check if current user is admin
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    throw new Error('Admin access required');
  }

  const adminSupabase = createAdminClient();
  const params: { start_date?: string; end_date?: string } = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const { data, error } = await adminSupabase.rpc(
    'get_admin_dashboard_data',
    params,
  );
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object')
    throw new Error('No dashboard data returned');
  const d: DashboardDataRpc =
    data && !Array.isArray(data) && typeof data === 'object' ? data : {};
  return {
    totalBookings: d.totalBookings ?? 0,
    newBookings: d.newBookings ?? 0,
    bookingsPerDay: d.bookingsPerDay ?? {},
    totalClients: d.totalClients ?? 0,
    newClients: d.newClients ?? 0,
    totalProfessionals: d.totalProfessionals ?? 0,
    newProfessionals: d.newProfessionals ?? 0,
    totalChats: d.totalChats ?? 0,
    newChats: d.newChats ?? 0,
    totalSupportRequests: d.totalSupportRequests ?? 0,
    newSupportRequests: d.newSupportRequests ?? 0,
  };
}

export async function AdminDashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  });
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
    if (path.includes('/admin/support-requests')) return 'support-requests';
    if (path.includes('/admin/messages')) return 'messages';
    if (path.includes('/admin/admins')) return 'admins';
    if (path.includes('/admin/legal')) return 'legal';
    if (path.includes('/admin/analytics')) return 'analytics';
    return 'overview';
  }
  const activeTab = getActiveTabFromPath(pathname);

  // Conditionally fetch dashboardData
  let dashboardData: DashboardData | undefined = undefined;
  const tabProps: {} = {};
  if (activeTab === 'overview') {
    dashboardData = await getAdminDashboardData({
      startDate: start,
      endDate: end,
    });
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
