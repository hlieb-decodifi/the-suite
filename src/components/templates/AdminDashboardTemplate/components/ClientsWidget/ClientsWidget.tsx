// Section widget for the Admin Dashboard.
// Displays client statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type ClientsWidgetProps = {
  totalClients: number
  newClients: number
}

export function ClientsWidget({ totalClients, newClients }: ClientsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h4">Clients Registered</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total clients: {totalClients}</Typography>
        <Typography>New clients (last 30 days): {newClients}</Typography>
      </CardContent>
    </Card>
  )
} 