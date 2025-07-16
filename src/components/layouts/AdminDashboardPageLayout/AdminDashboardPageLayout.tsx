'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardPageLayoutClient } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayoutClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export type AdminDashboardPageLayoutProps = {
  children: React.ReactNode;
  startDate?: string;
  endDate?: string;
};

// Throws if not authenticated or not admin. Returns the user object if authenticated and admin.
async function requireAdminUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
  if (!isAdmin) throw new Error('Not authorized');
  return user;
}

export async function getAdminDashboardData({ startDate, endDate }: { startDate?: string | undefined; endDate?: string | undefined }) {
  const adminSupabase = createAdminClient();
  const now = new Date();
  const toDate = endDate ?? now.toISOString();
  const fromDate = startDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Bookings
  const { count: totalBookings } = await adminSupabase
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
  bookingsPerDayData?.forEach(({ created_at }) => {
    const day = created_at.slice(0, 10);
    bookingsPerDay[day] = (bookingsPerDay[day] || 0) + 1;
  });

  // Clients
  const { count: totalClients } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', 'client');
  const { count: newClients } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', 'client')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Professionals
  const { count: totalProfessionals } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', 'professional');
  const { count: newProfessionals } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', 'professional')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Messages (chats)
  const { count: totalChats } = await adminSupabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  // Refunds
  const { count: totalRefunds } = await adminSupabase
    .from('refunds')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  return {
    totalBookings: totalBookings || 0,
    bookingsPerDay,
    totalClients: totalClients || 0,
    newClients: newClients || 0,
    totalProfessionals: totalProfessionals || 0,
    newProfessionals: newProfessionals || 0,
    totalChats: totalChats || 0,
    totalRefunds: totalRefunds || 0,
  };
}

export async function AdminDashboardPageLayout({ children, startDate, endDate }: AdminDashboardPageLayoutProps) {
  const supabase = await createClient();
  let user;
  try {
    user = await requireAdminUser(supabase);
  } catch {
    return redirect('/');
  }

  let dashboardData = {
    totalBookings: 0,
    bookingsPerDay: {},
    totalClients: 0,
    newClients: 0,
    totalProfessionals: 0,
    newProfessionals: 0,
    totalChats: 0,
    totalRefunds: 0,
  };
  try {
    dashboardData = await getAdminDashboardData({ startDate, endDate });
  } catch {
    // Optionally log error
  }

  return (
    <div className="w-full mx-auto">
      <AdminDashboardPageLayoutClient user={user} dashboardData={dashboardData}>
        {children}
      </AdminDashboardPageLayoutClient>
    </div>
  );
} 