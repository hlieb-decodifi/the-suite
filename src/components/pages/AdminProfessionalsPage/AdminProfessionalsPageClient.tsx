// Client component for admin professionals tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminProfessionalsTemplate } from '@/components/templates/AdminProfessionalsTemplate';

export function AdminProfessionalsPageClient() {
  const { start, end } = useDateRange();
  const [professionalsData, setProfessionalsData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setProfessionalsData({
        professionals: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading professionals...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!professionalsData) return null;

  return (
    <AdminProfessionalsTemplate />
  );
} 