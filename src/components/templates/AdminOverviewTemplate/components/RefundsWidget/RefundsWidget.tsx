// Section widget for the Admin Dashboard.
// Displays refunds statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type RefundsWidgetProps = {
  totalRefunds: number
  newRefunds: number
  dateRangeLabel: string
}

export function RefundsWidget({ totalRefunds, newRefunds, dateRangeLabel }: RefundsWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Refunds</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total refund requests: {totalRefunds}</Typography>
        <Typography>
          New refund requests <span className="text-yellow-500">{dateRangeLabel}</span>: {newRefunds}
        </Typography>
      </CardContent>
    </Card>
  )
} 