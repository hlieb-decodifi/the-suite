'use client';

import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { TabNavigation, TabItem } from '@/components/common/TabNavigation';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export type AdminDashboardPageLayoutClientProps = {
  user: User;
  children: React.ReactNode;
};

export function AdminDashboardPageLayoutClient({ user, children }: AdminDashboardPageLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/admin/dashboard' || path === '/admin/dashboard/') return 'overview';
    if (path.includes('/admin/dashboard/bookings')) return 'bookings';
    if (path.includes('/admin/dashboard/clients')) return 'clients';
    if (path.includes('/admin/dashboard/professionals')) return 'professionals';
    if (path.includes('/admin/dashboard/refunds')) return 'refunds';
    if (path.includes('/admin/dashboard/messages')) return 'messages';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath(pathname);

  // Helper to create tab URLs with preserved query params
  const createTabUrl = (basePath: string): string => {
    const params = searchParams.toString();
    return params ? `${basePath}?${params}` : basePath;
  };

  const tabs: TabItem[] = useMemo(() => [
    { key: 'overview', label: 'Overview', href: createTabUrl('/admin/dashboard'), isActive: activeTab === 'overview' },
    { key: 'bookings', label: 'Bookings', href: createTabUrl('/admin/dashboard/bookings'), isActive: activeTab === 'bookings' },
    { key: 'clients', label: 'Clients', href: createTabUrl('/admin/dashboard/clients'), isActive: activeTab === 'clients' },
    { key: 'professionals', label: 'Professionals', href: createTabUrl('/admin/dashboard/professionals'), isActive: activeTab === 'professionals' },
    { key: 'refunds', label: 'Refunds', href: createTabUrl('/admin/dashboard/refunds'), isActive: activeTab === 'refunds' },
    { key: 'messages', label: 'Messages', href: createTabUrl('/admin/dashboard/messages'), isActive: activeTab === 'messages' },
  ], [activeTab, searchParams]);

  const displayName = [user.user_metadata?.first_name, user.user_metadata?.last_name]
    .filter(Boolean)
    .join(' ') || user.email;

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
        {/* Placeholder for future date picker or admin actions */}
      </div>
      {/* Tab navigation */}
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