'use client';

import { TabNavigation, type TabItem } from '@/components/common/TabNavigation';
import { cn } from '@/utils';

type DashboardTemplateTabsProps = {
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const DASHBOARD_TABS: TabItem[] = [
  {
    key: 'overview',
    label: 'Overview',
  },
  {
    key: 'appointments',
    label: 'Appointments',
  },
  {
    key: 'messages',
    label: 'Messages',
  },
  {
    key: 'refunds',
    label: 'Refunds',
  },
];

export function DashboardTemplateTabs({
  className = '',
  activeTab,
  onTabChange,
}: DashboardTemplateTabsProps) {
  return (
    <TabNavigation
      tabs={DASHBOARD_TABS}
      variant="value"
      activeTab={activeTab}
      onTabChange={onTabChange}
      className={cn(className, 'mb-8')}
    />
  );
}
