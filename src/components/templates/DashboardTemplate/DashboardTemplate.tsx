'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import { DashboardTemplateProfessionalView } from './components/DashboardTemplateProfessionalView/DashboardTemplateProfessionalView';
import { DashboardTemplateClientView } from './components/DashboardTemplateClientView/DashboardTemplateClientView';
import { redirect } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { Loader2 } from 'lucide-react';

export function DashboardTemplate() {
  const { user, isLoading } = useAuthStore();
  const [dateRange, setDateRange] = useState<
    [Date | undefined, Date | undefined]
  >([undefined, undefined]);

  // For demo purposes, determine if user is professional based on email
  // This will be replaced with actual profile data in a real app
  const isProfessional = user?.user_metadata.role === 'professional' || false;

  useEffect(() => {
    // Redirect if not authenticated and not loading
    if (!isLoading && !user) {
      redirect('/');
    }
  }, [isLoading, user]);

  // Show loading state while auth state is being determined
  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <Typography className="text-muted-foreground">
          Loading dashboard...
        </Typography>
      </div>
    );
  }

  // Render appropriate view based on user type
  return (
    <div className="w-full">
        {isProfessional ? (
          <DashboardTemplateProfessionalView
            user={user}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        ) : (
          <DashboardTemplateClientView
            user={user}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}
    </div>
  );
}
