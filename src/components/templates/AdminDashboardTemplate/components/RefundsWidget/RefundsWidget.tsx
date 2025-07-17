// Section widget for the Admin Dashboard.
// Displays refunds statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type RefundsWidgetProps = {
  totalRefunds: number
}

export function RefundsWidget({ totalRefunds }: RefundsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h4">Refunds</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total refund requests (last 30 days): {totalRefunds}</Typography>
      </CardContent>
    </Card>
  )
} 