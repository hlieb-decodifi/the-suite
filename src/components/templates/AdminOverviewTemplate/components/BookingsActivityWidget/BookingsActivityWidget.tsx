// Section widget for the Admin Dashboard.
// Displays bookings activity statistics and chart.
// Used as a section component in AdminDashboardOverviewPageClient.
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { BookingsActivityGraph } from './BookingsActivityGraph';

type BookingsActivityWidgetProps = {
  totalBookings: number;
  newBookings: number;
  bookingsPerDay: Record<string, number>;
  dateRangeLabel: string;
};

export function BookingsActivityWidget({
  totalBookings,
  newBookings,
  bookingsPerDay,
  dateRangeLabel,
}: BookingsActivityWidgetProps) {
  // Transform bookingsPerDay to sorted array
  const bookingsPerDayArray = Object.entries(bookingsPerDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Card className="h-full">
      <CardHeader>
        <Typography variant="h4">Bookings Activity</Typography>
      </CardHeader>
      <CardContent>
        <Typography>Total bookings: {totalBookings}</Typography>
        <Typography>
          New bookings <span className="text-yellow-500">{dateRangeLabel}</span>
          : {newBookings}
        </Typography>
        <div className="mt-6">
          <BookingsActivityGraph data={bookingsPerDayArray} />
        </div>
      </CardContent>
    </Card>
  );
}
