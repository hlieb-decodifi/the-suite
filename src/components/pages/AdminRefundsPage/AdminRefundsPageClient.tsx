// Client component for admin refunds tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminRefundsTemplate } from '@/components/templates/AdminRefundsTemplate';

export function AdminRefundsPageClient() {
  const { start, end } = useDateRange();
  const [refundsData, setRefundsData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setRefundsData({
        refunds: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading refunds...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!refundsData) return null;

  return (
    <AdminRefundsTemplate />
  );
} 