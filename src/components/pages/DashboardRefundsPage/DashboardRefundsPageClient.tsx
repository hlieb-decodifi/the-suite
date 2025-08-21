'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';

type DashboardRefundsPageClientProps = {
  user: User;
  isProfessional: boolean;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

// Main component - simplified for migration message
export function DashboardRefundsPageClient({
  user,
  isProfessional,
  startDate,
  endDate,
}: DashboardRefundsPageClientProps) {
  const [error, setError] = useState<string | null>(null);

  // Remove unused parameters warning by using void operator
  void user;
  void isProfessional;
  void startDate;
  void endDate;

  // Fetch refunds data
  useEffect(() => {
    async function fetchRefunds() {
      try {
        setError(null);
        // Since refunds have been migrated to support requests, return empty array
      } catch (err) {
        console.error('Error fetching refunds:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    fetchRefunds();
  }, []);

  // Since refunds are now support requests, just return empty state
  if (error) {
    return (
      <div className="space-y-6">
        <Typography variant="h1">Refunds</Typography>
        <div className="text-center py-8 text-red-600">
          Refunds have been migrated to Support Requests. Please visit the Support Requests page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Typography variant="h1">Refunds</Typography>
      <div className="text-center py-8">
        <Typography className="text-muted-foreground">
          Refunds have been migrated to Support Requests. Please visit the Support Requests page to manage refund requests.
        </Typography>
      </div>
    </div>
  );
}