'use client';

import { cn } from '@/utils/cn';
import Link from 'next/link';
import { ReactNode } from 'react';

export type TabItem = {
  key: string;
  label: string;
  href?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  badge?: ReactNode;
  className?: string;
};

export type TabNavigationProps = {
  tabs: TabItem[];
  className?: string;
  variant?: 'link' | 'value';
  onTabChange?: (tabKey: string) => void;
  activeTab?: string;
};

export function TabNavigation({
  tabs,
  className = '',
  variant = 'link',
  onTabChange,
  activeTab,
}: TabNavigationProps) {
  const baseTabClasses =
    'min-w-24 flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all capitalize';

  const getTabClasses = (tab: TabItem) => {
    const isActive = variant === 'link' ? tab.isActive : activeTab === tab.key;

    return cn(
      baseTabClasses,
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
      tab.isDisabled && 'opacity-50 cursor-not-allowed',
      tab.className,
    );
  };

  const handleTabClick = (tab: TabItem) => {
    if (tab.isDisabled) return;

    if (variant === 'value' && onTabChange) {
      onTabChange(tab.key);
    }
  };

  return (
    <div
      className={cn(
        'gap-1 bg-muted/50 p-1 rounded-full inline-flex',
        className,
      )}
    >
      {tabs.map((tab) => {
        const tabClasses = getTabClasses(tab);

        if (variant === 'link' && tab.href) {
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={tabClasses}
              prefetch={true}
            >
              <span>{tab.label}</span>
              {tab.badge}
            </Link>
          );
        }

        return (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab)}
            className={tabClasses}
            disabled={tab.isDisabled}
            type="button"
          >
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
