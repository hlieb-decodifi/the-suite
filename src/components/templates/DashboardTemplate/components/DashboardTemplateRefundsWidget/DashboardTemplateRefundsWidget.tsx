'use client';

import { RefreshCcw } from 'lucide-react';
import { DashboardTemplateCard } from '../DashboardTemplateCard/DashboardTemplateCard';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils';
import { DashboardTemplateWidget } from '../DashboardTemplateWidget';
import { DashboardTemplateDateTime } from '../DashboardTemplateDateTime';

export type Refund = {
  id: string;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'declined';
  serviceName: string;
};

export type DashboardTemplateRefundsWidgetProps = {
  refunds: Refund[];
  totalRefunds: number;
  isLoading?: boolean;
  onViewAllClick?: () => void;
};

// Helper component to render refund status badge
function RefundStatusBadge({ status }: { status: Refund['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        >
          Pending Refund
        </Badge>
      );
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          Refund Completed
        </Badge>
      );
    case 'declined':
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20"
        >
          Refund Declined
        </Badge>
      );
    default:
      return null;
  }
}

// Component for showing empty refunds state
function EmptyRefundsState() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-40">
      <RefreshCcw className="h-8 w-8 mb-2 text-muted-foreground" />
      <p className="text-center">No refunds</p>
      <p className="text-center text-sm text-muted-foreground">
        Any refund requests will appear here.
      </p>
    </div>
  );
}

// Component for loading state
function LoadingRefundsState() {
  return (
    <div className="p-6 space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex justify-between p-3 rounded bg-muted/10 animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted/30 rounded" />
            <div className="h-3 w-16 bg-muted/30 rounded" />
          </div>
          <div className="h-6 w-16 bg-muted/30 rounded" />
        </div>
      ))}
    </div>
  );
}

// Refund item component
function RefundItem({ refund }: { refund: Refund }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <Typography className="font-medium">
            {formatCurrency(refund.amount)}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {refund.serviceName}
          </Typography>
        </div>
        <RefundStatusBadge status={refund.status} />
      </div>
      <DashboardTemplateDateTime
        date={refund.date}
        variant="compact"
        showIcons={true}
      />
    </div>
  );
}

export function DashboardTemplateRefundsWidget({
  refunds,
  totalRefunds,
  isLoading = false,
  onViewAllClick,
}: DashboardTemplateRefundsWidgetProps) {
  const pendingRefunds = refunds.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DashboardTemplateCard
          title="Refunds"
          value={totalRefunds.toString()}
          description={
            pendingRefunds > 0
              ? `${pendingRefunds} pending ${pendingRefunds === 1 ? 'refund' : 'refunds'}`
              : 'No pending refunds'
          }
          icon={<RefreshCcw className="h-5 w-5" />}
          isLoading={isLoading}
          colorVariant={pendingRefunds > 0 ? 'warning' : 'default'}
          className="flex-1"
        />
      </div>

      <DashboardTemplateWidget
        isLoading={isLoading}
        loadingContent={<LoadingRefundsState />}
        emptyContent={<EmptyRefundsState />}
        isEmpty={refunds.length === 0}
        onViewAllClick={onViewAllClick}
        viewAllText="View all refunds"
      >
        {refunds.slice(0, 3).map((refund) => (
          <RefundItem key={refund.id} refund={refund} />
        ))}
      </DashboardTemplateWidget>
    </div>
  );
}
