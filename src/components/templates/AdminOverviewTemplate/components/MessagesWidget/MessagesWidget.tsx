// Section widget for the Admin Dashboard.
// Displays messages statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type MessagesWidgetProps = {
  totalChats: number;
  newChats: number;
  dateRangeLabel: string;
};

export function MessagesWidget({
  totalChats,
  newChats,
  dateRangeLabel,
}: MessagesWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Messages</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total chats: {totalChats}</Typography>
        <Typography>
          New chats <span className="text-yellow-500">{dateRangeLabel}</span>:{' '}
          {newChats}
        </Typography>
      </CardContent>
    </Card>
  );
}
