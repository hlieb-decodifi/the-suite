import React from 'react';
import { Typography } from '@/components/ui/typography';

// Template component for the Admin Dashboard page.
// Responsible for layout and composition of dashboard widgets.
// Used by AdminDashboardOverviewPageClient as the main layout wrapper.

type AdminOverviewTemplateProps = {
  children?: React.ReactNode;
  // Add props for stats/widgets as needed
};

export function AdminOverviewTemplate({ children }: AdminOverviewTemplateProps) {
  // Children order: BookingsActivityWidget, ClientsWidget, ProfessionalsWidget, MessagesWidget, RefundsWidget
  // We'll use grid to align as per the user's diagram
  return (
    <section className="p-4">
      <Typography variant="h2">Overview</Typography>
      <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 mt-4">
        {/* BookingsActivityWidget: fixed height 384px on md+ */}
        <div className="row-span-2 col-span-1 h-full min-h-0 flex flex-col md:h-[384px]">
          {Array.isArray(children) ? children[0] : children}
        </div>
        {/* ClientsWidget: top row, center */}
        <div className="col-span-1 row-span-1 h-full min-h-0 flex flex-col md:h-[180px]">
          {Array.isArray(children) ? children[1] : null}
        </div>
        {/* ProfessionalsWidget: top row, right */}
        <div className="col-span-1 row-span-1 h-full min-h-0 flex flex-col md:h-[180px]">
          {Array.isArray(children) ? children[2] : null}
        </div>
        {/* MessagesWidget: bottom row, center */}
        <div className="col-span-1 row-span-1 h-full min-h-0 flex flex-col md:h-[180px]">
          {Array.isArray(children) ? children[3] : null}
        </div>
        {/* RefundsWidget: bottom row, right */}
        <div className="col-span-1 row-span-1 h-full min-h-0 flex flex-col md:h-[180px]">
          {Array.isArray(children) ? children[4] : null}
        </div>
      </div>
    </section>
  );
} 