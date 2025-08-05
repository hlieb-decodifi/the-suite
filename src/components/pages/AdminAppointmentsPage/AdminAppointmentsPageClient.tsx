// Client component for admin appointments tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminAppointmentsTemplate } from '@/components/templates/AdminAppointmentsTemplate';

export function AdminAppointmentsPageClient() {
  const { start, end } = useDateRange();
  const [appointmentsData, setAppointmentsData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setAppointmentsData({
        appointments: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading appointments...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!appointmentsData) return null;

  return <AdminAppointmentsTemplate />;
}
