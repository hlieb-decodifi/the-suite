// Section widget for the Admin Dashboard.
// Displays bookings activity statistics and chart.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

type BookingsActivityWidgetProps = {
  totalBookings: number
  bookingsPerDay: Record<string, number>
}

export function BookingsActivityWidget({ totalBookings, bookingsPerDay }: BookingsActivityWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h4">Bookings Activity</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total bookings: {totalBookings}</Typography>
        {/* Chart placeholder */}
        <div className="bg-gray-100 h-32 rounded mt-2 flex items-center justify-center text-gray-400">
          [Bookings Activity Chart]
        </div>
        {/* Bookings per day text display */}
        <div className="mt-4">
          <Typography variant="h6">Bookings per day:</Typography>
          {Object.entries(bookingsPerDay).length === 0 ? (
            <Typography variant="muted">No bookings in range.</Typography>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {Object.entries(bookingsPerDay).map(([date, count]) => (
                <li key={date}>{date}: {count}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 