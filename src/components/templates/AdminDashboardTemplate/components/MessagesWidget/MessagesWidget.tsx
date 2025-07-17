// Section widget for the Admin Dashboard.
// Displays messages statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type MessagesWidgetProps = {
  totalChats: number
}

export function MessagesWidget({ totalChats }: MessagesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h4">Messages</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total chats: {totalChats}</Typography>
      </CardContent>
    </Card>
  )
} 