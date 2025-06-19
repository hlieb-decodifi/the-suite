'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { UserDashboardData } from './DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { TabNavigation, TabItem } from '@/components/common/TabNavigation';
import { useState } from 'react';
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
  const [dateRange, setDateRange] = useState<DateRange>();

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/dashboard' || path === '/dashboard/') return 'overview';
    if (path.includes('/dashboard/appointments')) return 'appointments';
    if (path.includes('/dashboard/messages')) return 'messages';
    if (path.includes('/dashboard/refunds')) return 'refunds';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath(pathname);

  // Create tabs array for TabNavigation component
  const tabs: TabItem[] = [
    {
      key: 'overview',
      label: 'Overview',
      href: '/dashboard',
      isActive: activeTab === 'overview',
    },
    {
      key: 'appointments',
      label: 'Appointments',
      href: '/dashboard/appointments',
      isActive: activeTab === 'appointments',
    },
    {
      key: 'messages',
      label: 'Messages',
      href: '/dashboard/messages',
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
      key: 'refunds',
      label: 'Refunds',
      href: '/dashboard/refunds',
      isActive: activeTab === 'refunds',
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
              onDateRangeChange={setDateRange}
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
