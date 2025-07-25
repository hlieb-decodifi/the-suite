'use client';

import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { TabNavigation, TabItem } from '@/components/common/TabNavigation';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, createContext } from 'react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/common/DateRangePicker/DateRangePicker';
import React from 'react';
import { useDateRange } from './DateRangeContextProvider';
import { formatDateLocalYYYYMMDD } from '@/utils/formatDate';

export type DateRangeContextType = {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};

export const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export type AdminDashboardPageLayoutClientProps = {
  user: User;
  children: React.ReactNode;
  dashboardData: {
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
};

export function AdminDashboardPageLayoutClient({ user, children, dashboardData }: AdminDashboardPageLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, end, setDateRange } = useDateRange();

  // Helper to parse YYYY-MM-DD as local date
  function parseLocalDate(dateString: string) {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
  }

  // Convert context values to DateRange for DateRangePicker
  const dateRange = useMemo(() => {
    if (!start && !end) return undefined;
    return {
      from: start ? parseLocalDate(start) : undefined,
      to: end ? parseLocalDate(end) : undefined,
    };
  }, [start, end]);

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/admin' || path === '/admin/') return 'overview';
    if (path.includes('/admin/bookings')) return 'bookings';
    if (path.includes('/admin/clients')) return 'clients';
    if (path.includes('/admin/professionals')) return 'professionals';
    if (path.includes('/admin/refunds')) return 'refunds';
    if (path.includes('/admin/messages')) return 'messages';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath(pathname);

  // Helper to create tab URLs with preserved query params
  const createTabUrl = (basePath: string): string => {
    const params = searchParams.toString();
    return params ? `${basePath}?${params}` : basePath;
  };

  const tabs: TabItem[] = useMemo(() => [
    { key: 'overview', label: 'Overview', href: createTabUrl('/admin'), isActive: activeTab === 'overview' },
    { key: 'bookings', label: 'Bookings', href: createTabUrl('/admin/bookings'), isActive: activeTab === 'bookings' },
    { key: 'clients', label: 'Clients', href: createTabUrl('/admin/clients'), isActive: activeTab === 'clients' },
    { key: 'professionals', label: 'Professionals', href: createTabUrl('/admin/professionals'), isActive: activeTab === 'professionals' },
    { key: 'refunds', label: 'Refunds', href: createTabUrl('/admin/refunds'), isActive: activeTab === 'refunds' },
    { key: 'messages', label: 'Messages', href: createTabUrl('/admin/messages'), isActive: activeTab === 'messages' },
  ], [activeTab, searchParams]);

  const displayName = [user.user_metadata?.first_name, user.user_metadata?.last_name]
    .filter(Boolean)
    .join(' ') || user.email;

  // Helper to update URL params on date range change
  function handleDateRangeChange(range: DateRange | undefined) {
    if (range?.from || range?.to) {
      setDateRange(
        range?.from ? formatDateLocalYYYYMMDD(range.from) : undefined,
        range?.to ? formatDateLocalYYYYMMDD(range.to) : undefined
      );
    } else {
      setDateRange(undefined, undefined);
    }
    // URL update handled by context provider
  }

  // Propagate dashboardData to children if they are valid React elements
  const childrenWithDashboardData = React.Children.map(children, child => {
    if (
      React.isValidElement(child) &&
      typeof child.type === 'function' &&
      !('dashboardData' in (child.props as object))
    ) {
      return React.cloneElement(
        child as React.ReactElement<{ dashboardData: typeof dashboardData }>,
        { dashboardData }
      );
    }
    return child;
  });

  return (
    <div className="w-full mx-auto space-y-4 lg:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 lg:gap-4">
        <div className="flex-1 min-w-0">
          <Typography
            variant="h2"
            className="leading-5 border-none font-bold text-foreground text-xl lg:text-2xl"
          >
            Admin Dashboard
          </Typography>
          <Typography className="text-muted-foreground text-sm lg:text-base truncate">
            Welcome, {displayName}
          </Typography>
        </div>
      </div>
      {/* Tab navigation and date picker row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 mb-4 lg:mb-6">
        <div className="overflow-x-auto flex-1 min-w-0">
          <TabNavigation
            tabs={tabs}
            variant="link"
            className="min-w-max"
          />
        </div>
        <div className="w-full md:w-auto md:ml-4 flex-shrink-0">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>
      {/* Main content */}
      <div className="mt-4">{childrenWithDashboardData}</div>
    </div>
  );
} 