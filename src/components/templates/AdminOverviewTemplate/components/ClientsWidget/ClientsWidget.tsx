// Section widget for the Admin Dashboard.
// Displays client statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type ClientsWidgetProps = {
  totalClients: number;
  newClients: number;
  dateRangeLabel: string;
};

export function ClientsWidget({
  totalClients,
  newClients,
  dateRangeLabel,
}: ClientsWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Clients Registered</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total clients: {totalClients}</Typography>
        <Typography>
          New clients <span className="text-yellow-500">{dateRangeLabel}</span>:{' '}
          {newClients}
        </Typography>
      </CardContent>
    </Card>
  );
}
