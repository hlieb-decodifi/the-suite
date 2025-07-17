// Client component for admin bookings tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminBookingsTemplate } from '@/components/templates/AdminBookingsTemplate';

export function AdminBookingsPageClient() {
  const { start, end } = useDateRange();
  const [bookingsData, setBookingsData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setBookingsData({
        bookings: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading bookings...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!bookingsData) return null;

  return (
    <AdminBookingsTemplate />
  );
} 