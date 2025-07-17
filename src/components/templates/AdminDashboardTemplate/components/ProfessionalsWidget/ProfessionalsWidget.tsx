// Section widget for the Admin Dashboard.
// Displays professional statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type ProfessionalsWidgetProps = {
  totalProfessionals: number
  newProfessionals: number
}

export function ProfessionalsWidget({ totalProfessionals, newProfessionals }: ProfessionalsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h4">Service Professionals</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total professionals: {totalProfessionals}</Typography>
        <Typography>New professionals (last 30 days): {newProfessionals}</Typography>
      </CardContent>
    </Card>
  )
} 