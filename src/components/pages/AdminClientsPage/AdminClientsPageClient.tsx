// Client component for admin clients tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminClientsTemplate } from '@/components/templates/AdminClientsTemplate';

export function AdminClientsPageClient() {
  const { start, end } = useDateRange();
  const [clientsData, setClientsData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setClientsData({
        clients: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading clients...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!clientsData) return null;

  return (
    <AdminClientsTemplate />
  );
} 