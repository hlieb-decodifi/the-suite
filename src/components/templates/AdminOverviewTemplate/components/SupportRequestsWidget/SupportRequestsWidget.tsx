// Section widget for the Admin Dashboard.
// Displays support requests statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type SupportRequestsWidgetProps = {
  totalSupportRequests: number;
  newSupportRequests: number;
  dateRangeLabel: string;
};

export function SupportRequestsWidget({
  totalSupportRequests,
  newSupportRequests,
  dateRangeLabel,
}: SupportRequestsWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Support Requests</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total support requests: {totalSupportRequests}</Typography>
        <Typography>
          New support requests{' '}
          <span className="text-yellow-500">{dateRangeLabel}</span>:{' '}
          {newSupportRequests}
        </Typography>
      </CardContent>
    </Card>
  );
}
