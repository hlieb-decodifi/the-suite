'use server';

import { AdminDashboardClient } from './AdminDashboardClient';
import { getAdminDashboardData } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayout';

export default async function AdminDashboardPage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
  let startDate = typeof searchParams?.start_date === 'string' ? searchParams.start_date : undefined;
  let endDate = typeof searchParams?.end_date === 'string' ? searchParams.end_date : undefined;

  if (!startDate && !endDate) {
    // Default to last 30 days
    const now = new Date();
    endDate = now.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate = thirtyDaysAgo.toISOString();
  }

  const data = await getAdminDashboardData({ startDate, endDate });
  return (
    <AdminDashboardClient
      totalBookings={data.totalBookings}
      bookingsPerDay={data.bookingsPerDay}
      totalClients={data.totalClients}
      newClients={data.newClients}
      totalProfessionals={data.totalProfessionals}
      newProfessionals={data.newProfessionals}
      totalChats={data.totalChats}
      totalRefunds={data.totalRefunds}
    />
  );
} 