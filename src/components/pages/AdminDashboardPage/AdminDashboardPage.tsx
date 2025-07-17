'use server';

import { AdminDashboardPageClient } from './AdminDashboardPageClient';
import { getAdminDashboardData } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayout';

export default async function AdminDashboardPage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
  // Parse date range from searchParams
  let startDate = typeof searchParams?.start_date === 'string' ? searchParams.start_date : undefined;
  let endDate = typeof searchParams?.end_date === 'string' ? searchParams.end_date : undefined;
  if (!startDate && !endDate) {
    const now = new Date();
    endDate = now.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate = thirtyDaysAgo.toISOString();
  }

  // Fetch dashboard data
  const dashboardData = await getAdminDashboardData({ startDate, endDate });

  return <AdminDashboardPageClient {...dashboardData} />;
} 