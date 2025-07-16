import React from 'react'

type BookingsActivityWidgetProps = {
  totalBookings: number
  bookingsPerDay: Record<string, number>
}

export function BookingsActivityWidget({ totalBookings, bookingsPerDay }: BookingsActivityWidgetProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Bookings Activity</h2>
      <div>Total bookings: {totalBookings}</div>
      {/* Chart placeholder */}
      <div className="bg-gray-100 h-32 rounded mt-2 flex items-center justify-center text-gray-400">
        [Bookings Activity Chart]
      </div>
      {/* Bookings per day text display */}
      <div className="mt-4">
        <h3 className="font-medium mb-1 text-sm text-muted-foreground">Bookings per day:</h3>
        {Object.entries(bookingsPerDay).length === 0 ? (
          <div className="text-xs text-muted-foreground">No bookings in range.</div>
        ) : (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {Object.entries(bookingsPerDay).map(([date, count]) => (
              <li key={date}>{date}: {count}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
} 