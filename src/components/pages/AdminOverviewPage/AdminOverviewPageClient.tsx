// Client component for admin dashboard overview tab
"use client";
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { getAdminDashboardData } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayout';
import { AdminOverviewTemplate } from '@/components/templates/AdminOverviewTemplate';
import {
  BookingsActivityWidget,
  ClientsWidget,
  ProfessionalsWidget,
  MessagesWidget,
  RefundsWidget,
} from '@/components/templates/AdminOverviewTemplate/components';
import { formatDate } from '@/utils/formatDate';

type DashboardData = {
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

export default function AdminOverviewPageClient() {
  const { start, end } = useDateRange();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute date range label in the same format as the DateRangePicker
  function formatDatePicker(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return formatDate(d);
  }
  let dateRangeLabel = '';
  if (start && end) dateRangeLabel = `(${formatDatePicker(start)} - ${formatDatePicker(end)})`;
  else if (start) dateRangeLabel = `(from ${formatDatePicker(start)})`;
  else if (end) dateRangeLabel = `(to ${formatDatePicker(end)})`;
  else dateRangeLabel = '(last 30 days)';

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAdminDashboardData({ startDate: start, endDate: end })
      .then(data => setDashboardData(data))
      .catch(err => setError(err.message || 'Failed to fetch data'))
      .finally(() => setLoading(false));
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading overview...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!dashboardData) return null;

  return (
    <AdminOverviewTemplate>
      <BookingsActivityWidget
        totalBookings={dashboardData.totalBookings}
        newBookings={dashboardData.newBookings}
        bookingsPerDay={dashboardData.bookingsPerDay}
        dateRangeLabel={dateRangeLabel}
      />
      <ClientsWidget
        totalClients={dashboardData.totalClients}
        newClients={dashboardData.newClients}
        dateRangeLabel={dateRangeLabel}
      />
      <ProfessionalsWidget
        totalProfessionals={dashboardData.totalProfessionals}
        newProfessionals={dashboardData.newProfessionals}
        dateRangeLabel={dateRangeLabel}
      />
      <MessagesWidget totalChats={dashboardData.totalChats} newChats={dashboardData.newChats} dateRangeLabel={dateRangeLabel} />
      <RefundsWidget totalRefunds={dashboardData.totalRefunds} newRefunds={dashboardData.newRefunds} dateRangeLabel={dateRangeLabel} />
    </AdminOverviewTemplate>
  );
} 