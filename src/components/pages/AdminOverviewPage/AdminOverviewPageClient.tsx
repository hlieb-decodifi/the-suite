// Client component for admin dashboard overview tab
"use client";
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { subDays, format as formatDateFns } from 'date-fns';
import { useEffect, useState, useRef } from 'react';
import { getAdminDashboardData } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayout';
import { AdminOverviewTemplate } from '@/components/templates/AdminOverviewTemplate';
import {
  BookingsActivityWidget,
  ClientsWidget,
  ProfessionalsWidget,
  MessagesWidget,
  RefundsWidget,
} from '@/components/templates/AdminOverviewTemplate/components';


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
  const { start, end, setDateRange } = useDateRange();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store the initial date range
  const initialRange = useRef<{ start?: string; end?: string }>(
    Object.assign({}, start ? { start } : {}, end ? { end } : {})
  );
  const isInitialMount = useRef(true);
  const didSetDefault = useRef(false);

  // Helper to get default last 30 days range in yyyy-MM-dd
  function getDefaultRange() {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29); // inclusive of today
    return {
      start: formatDateFns(thirtyDaysAgo, 'yyyy-MM-dd'),
      end: formatDateFns(today, 'yyyy-MM-dd'),
    };
  }

  // Compute date range label in the same format as the DateRangePicker
  let dateRangeLabel = '(all time)';
  if (start && end) {
    // If the range is exactly the last 30 days, show '(last 30 days)'
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    const startStr = formatDateFns(thirtyDaysAgo, 'yyyy-MM-dd');
    const endStr = formatDateFns(today, 'yyyy-MM-dd');
    if (start === startStr && end === endStr) {
      dateRangeLabel = '(last 30 days)';
    } else {
      // Otherwise, show the actual range
      dateRangeLabel = `${start} to ${end}`;
    }
  }

  useEffect(() => {
    // Only set default last 30 days on first mount if both are undefined
    if (!start && !end && !didSetDefault.current) {
      const { start: defaultStart, end: defaultEnd } = getDefaultRange();
      setDateRange(defaultStart, defaultEnd);
      didSetDefault.current = true;
      return;
    }
    // If user clears, allow showing all data (no date range)
    // Skip fetch on initial mount if date range matches initial values
    if (
      isInitialMount.current &&
      initialRange.current.start === start &&
      initialRange.current.end === end
    ) {
      isInitialMount.current = false;
      setLoading(false);
      return;
    }
    isInitialMount.current = false;
    setLoading(true);
    setError(null);
    getAdminDashboardData({ startDate: start, endDate: end })
      .then(data => setDashboardData(data))
      .catch(err => setError(err.message || 'Failed to fetch data'))
      .finally(() => setLoading(false));
  }, [start, end, setDateRange]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading overview...</div>;

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        {error}
        <br />
        <button
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
          onClick={() => {
            setLoading(true);
            setError(null);
            getAdminDashboardData({ startDate: start, endDate: end })
              .then(data => setDashboardData(data))
              .catch(err => setError(err.message || 'Failed to fetch data'))
              .finally(() => setLoading(false));
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No overview data available.<br />
        <button
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
          onClick={() => {
            setLoading(true);
            setError(null);
            getAdminDashboardData({ startDate: start, endDate: end })
              .then(data => setDashboardData(data))
              .catch(err => setError(err.message || 'Failed to fetch data'))
              .finally(() => setLoading(false));
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AdminOverviewTemplate
      bookingsActivity={
        <BookingsActivityWidget
          totalBookings={dashboardData.totalBookings}
          newBookings={dashboardData.newBookings}
          bookingsPerDay={dashboardData.bookingsPerDay}
          dateRangeLabel={dateRangeLabel}
        />
      }
      clients={
        <ClientsWidget
          totalClients={dashboardData.totalClients}
          newClients={dashboardData.newClients}
          dateRangeLabel={dateRangeLabel}
        />
      }
      professionals={
        <ProfessionalsWidget
          totalProfessionals={dashboardData.totalProfessionals}
          newProfessionals={dashboardData.newProfessionals}
          dateRangeLabel={dateRangeLabel}
        />
      }
      messages={
        <MessagesWidget
          totalChats={dashboardData.totalChats}
          newChats={dashboardData.newChats}
          dateRangeLabel={dateRangeLabel}
        />
      }
      refunds={
        <RefundsWidget
          totalRefunds={dashboardData.totalRefunds}
          newRefunds={dashboardData.newRefunds}
          dateRangeLabel={dateRangeLabel}
        />
      }
    />
  );
}