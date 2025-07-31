// Section widget for the Admin Dashboard.
// Displays professional statistics.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type ProfessionalsWidgetProps = {
  totalProfessionals: number
  newProfessionals: number
  dateRangeLabel: string
}

export function ProfessionalsWidget({ totalProfessionals, newProfessionals, dateRangeLabel }: ProfessionalsWidgetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Service Professionals</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total professionals: {totalProfessionals}</Typography>
        <Typography>
          New professionals <span className="text-yellow-500">{dateRangeLabel}</span>: {newProfessionals}
        </Typography>
      </CardContent>
    </Card>
  )
} 