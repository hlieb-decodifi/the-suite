'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { RefundType } from '@/components/pages/DashboardPage/DashboardPageClient';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DashboardTemplateRefundsTable,
  type Refund,
} from '@/components/templates/DashboardTemplate/components/DashboardTemplateRefundsTable/DashboardTemplateRefundsTable';

type DashboardRefundsPageClientProps = {
  user: User;
  isProfessional: boolean;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

// Filter buttons component - exact copy from appointments page
function FilterButtons({
  activeFilter,
  setActiveFilter,
  pendingCount,
  approvedCount,
  completedCount,
  declinedCount,
}: {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
  declinedCount: number;
}) {
  const filters = [
    {
      key: 'all',
      label: 'All',
      count: pendingCount + approvedCount + completedCount + declinedCount,
    },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'completed', label: 'Completed', count: completedCount },
    { key: 'declined', label: 'Declined', count: declinedCount },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'outline'}
          onClick={() => setActiveFilter(filter.key)}
          className="text-sm"
        >
          {filter.label} ({filter.count})
        </Button>
      ))}
    </div>
  );
}

// Main component - exact structure from appointments page
export function DashboardRefundsPageClient({
  user,
  isProfessional,
  startDate,
  endDate,
}: DashboardRefundsPageClientProps) {
  const [refunds, setRefunds] = useState<RefundType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch refunds data
  useEffect(() => {
    async function fetchRefunds() {
      try {
        const { getDashboardRefunds } = await import(
          '@/components/pages/DashboardPage/DashboardPage'
        );
        const refundsData = await getDashboardRefunds(
          user.id,
          isProfessional,
          startDate,
          endDate,
        );
        setRefunds(refundsData);
      } catch (error) {
        console.error('Error fetching refunds:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRefunds();
  }, [user.id, isProfessional, startDate, endDate]);

  // Transform refunds into the format needed for the table
  const transformedRefunds: Refund[] = refunds.map((refund) => {
    const appointmentDate = new Date(refund.appointmentDate);

    return {
      id: refund.id,
      date: appointmentDate,
      time: format(appointmentDate, 'h:mm a'),
      serviceName: refund.serviceName,
      clientName: refund.clientName,
      professionalName: refund.professionalName,
      status: refund.status as Refund['status'],
      amount:
        refund.refundAmount || refund.requestedAmount || refund.originalAmount,
      requestedAmount: refund.requestedAmount || undefined,
      originalAmount: refund.originalAmount,
    };
  });

  // Filter refunds based on selected filters
  const filteredRefunds = transformedRefunds.filter((refund) => {
    // Status filter
    if (activeFilter !== 'all' && refund.status !== activeFilter) {
      return false;
    }
    return true;
  });

  // Group refunds by status
  const pendingRefunds = filteredRefunds.filter(
    (refund) => refund.status === 'pending',
  );

  const approvedRefunds = filteredRefunds.filter(
    (refund) => refund.status === 'approved',
  );

  const completedRefunds = filteredRefunds.filter(
    (refund) => refund.status === 'completed',
  );

  const declinedRefunds = filteredRefunds.filter(
    (refund) => refund.status === 'declined',
  );

  // Table view with filters - exact structure from appointments page
  return (
    <div className="space-y-6">
      {/* Regular Table View */}
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Refunds
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {filteredRefunds.length} refunds
          </Typography>
        </div>
        <div className="p-4">
          <FilterButtons
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            pendingCount={pendingRefunds.length}
            approvedCount={approvedRefunds.length}
            completedCount={completedRefunds.length}
            declinedCount={declinedRefunds.length}
          />

          <DashboardTemplateRefundsTable
            refunds={
              activeFilter === 'all'
                ? filteredRefunds
                : filteredRefunds.filter((r) => r.status === activeFilter)
            }
            isLoading={isLoading}
            isProfessionalView={isProfessional}
          />
        </div>
      </div>
    </div>
  );
}
