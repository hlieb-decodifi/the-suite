'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';

type DashboardTemplateTabsProps = {
  className?: string;
};

export function DashboardTemplateTabs({
  className = '',
}: DashboardTemplateTabsProps) {
  return (
    <TabsList
      className={`gap-1 w-full max-w-md bg-muted/50 p-1 rounded-full ${className}`}
    >
      <TabsTrigger
        value="overview"
        className="border-primary flex items-center justify-center gap-1.5 flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Overview
      </TabsTrigger>
      <TabsTrigger
        value="appointments"
        className="border-primary flex items-center justify-center gap-1.5 flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Appointments
      </TabsTrigger>
      <TabsTrigger
        value="messages"
        className="border-primary flex items-center justify-center gap-1.5 flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Messages
      </TabsTrigger>
      <TabsTrigger
        value="refunds"
        className="border-primary flex items-center justify-center gap-1.5 flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        Refunds
      </TabsTrigger>
    </TabsList>
  );
}
