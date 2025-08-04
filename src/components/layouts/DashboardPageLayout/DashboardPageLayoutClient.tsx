'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { UserDashboardData } from './DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { TabNavigation, TabItem } from '@/components/common/TabNavigation';
import { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { DashboardTemplateDateRangePicker } from '@/components/templates/DashboardTemplate/components/DashboardTemplateDateRangePicker/DashboardTemplateDateRangePicker';
import { MessageBadge } from '@/components/ui/message-badge';

type DashboardPageLayoutClientProps = {
  user: User;
  userData: UserDashboardData;
  children: React.ReactNode;
};

export function DashboardPageLayoutClient({
  userData,
  children,
}: DashboardPageLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange>();

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/dashboard' || path === '/dashboard/') return 'overview';
    if (path.includes('/dashboard/appointments')) return 'appointments';
    if (path.includes('/dashboard/messages')) return 'messages';
    if (path.includes('/dashboard/support-requests')) return 'support-requests';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath(pathname);

  // Helper function to parse date string as local date (YYYY-MM-DD)
  const parseDateFromURL = (dateString: string): Date | undefined => {
    if (!dateString || !dateString.trim()) return undefined;

    // Parse YYYY-MM-DD as local date
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return undefined;

    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day);
  };

  // Initialize date range from URL parameters on mount
  useEffect(() => {
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (startDate || endDate) {
      setDateRange({
        from: parseDateFromURL(startDate || ''),
        to: parseDateFromURL(endDate || ''),
      });
    }
  }, [searchParams]);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateForURL = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date range changes and update URL
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);

      const params = new URLSearchParams(searchParams.toString());

      if (range.from) {
        params.set('start_date', formatDateForURL(range.from));

        // If no end date is selected, use the start date as the end date (single date selection)
        if (range.to) {
          params.set('end_date', formatDateForURL(range.to));
        } else {
          params.set('end_date', formatDateForURL(range.from));
        }
      } else {
        params.delete('start_date');
        params.delete('end_date');
      }

      // Update URL without triggering a full page reload
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.push(newUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Helper function to create tab URLs with preserved query parameters
  const createTabUrl = (basePath: string): string => {
    const params = searchParams.toString();
    return params ? `${basePath}?${params}` : basePath;
  };

  // Create tabs array for TabNavigation component
  const tabs: TabItem[] = [
    {
      key: 'overview',
      label: 'Overview',
      href: createTabUrl('/dashboard'),
      isActive: activeTab === 'overview',
    },
    {
      key: 'appointments',
      label: 'Appointments',
      href: createTabUrl('/dashboard/appointments'),
      isActive: activeTab === 'appointments',
    },
    {
      key: 'messages',
      label: 'Messages',
      href: createTabUrl('/dashboard/messages'),
      isActive: activeTab === 'messages',
      badge:
        userData.unreadMessagesCount && userData.unreadMessagesCount > 0 ? (
          <MessageBadge
            count={userData.unreadMessagesCount}
            size="sm"
            variant={activeTab === 'messages' ? 'active' : 'default'}
            className="ml-1.5 hover:bg-white hover:text-primary"
          />
        ) : undefined,
    },
    {
      key: 'support-requests',
      label: 'Support Requests',
      href: createTabUrl('/dashboard/support-requests'),
      isActive: activeTab === 'support-requests',
      badge:
        userData.unreadSupportMessagesCount && userData.unreadSupportMessagesCount > 0 ? (
          <MessageBadge
            count={userData.unreadSupportMessagesCount}
            size="sm"
            variant={activeTab === 'support-requests' ? 'active' : 'default'}
            className="ml-1.5 hover:bg-white hover:text-primary"
          />
        ) : undefined,
    },
  ];

  const displayName =
    userData.firstName && userData.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData.firstName || userData.lastName || '';

  return (
    <div className="w-full mx-auto space-y-4 lg:space-y-6">
      {/* Page header with title and profile link */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 lg:gap-4">
        <div className="flex-1 min-w-0">
          <Typography
            variant="h2"
            className="leading-5 border-none font-bold text-foreground text-xl lg:text-2xl"
          >
            Dashboard
          </Typography>
          <Typography className="text-muted-foreground text-sm lg:text-base truncate">
            Welcome back
            {displayName ? `, ${displayName}` : ''}
          </Typography>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 lg:gap-3 w-full sm:w-auto">
          <Link
            href={userData.isProfessional ? '/profile' : '/client-profile'}
            className="w-full sm:w-auto cursor-pointer"
          >
            <Button
              variant="outline"
              className="w-full font-medium justify-start text-foreground border-border text-sm lg:text-base"
            >
              <UserCircle size={14} className="mr-2 lg:w-4 lg:h-4" />
              Go to Profile
            </Button>
          </Link>

          {activeTab !== 'messages' && (
            <DashboardTemplateDateRangePicker
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              className="w-full sm:w-auto"
            />
          )}
        </div>
      </div>

      {/* Dashboard navigation using TabNavigation component */}
      <div className="overflow-x-auto">
        <TabNavigation
          tabs={tabs}
          variant="link"
          className="mb-4 lg:mb-6 min-w-max"
        />
      </div>

      {/* Main content */}
      <div className="mt-4">{children}</div>
    </div>
  );
}
