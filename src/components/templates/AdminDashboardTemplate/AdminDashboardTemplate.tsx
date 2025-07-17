import React from 'react';
import { Typography } from '@/components/ui/typography';

// Template component for the Admin Dashboard page.
// Responsible for layout and composition of dashboard widgets.
// Used by AdminDashboardOverviewPageClient as the main layout wrapper.

type AdminDashboardTemplateProps = {
  children?: React.ReactNode;
  // Add props for stats/widgets as needed
};

export function AdminDashboardTemplate({ children }: AdminDashboardTemplateProps) {
  return (
    <section className="p-4">
      <Typography variant="h2">Overview</Typography>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        {children || (
          <Typography variant="muted" className="col-span-full text-center">
            Welcome, admin! Dashboard content coming soon.
          </Typography>
        )}
      </div>
    </section>
  );
} 