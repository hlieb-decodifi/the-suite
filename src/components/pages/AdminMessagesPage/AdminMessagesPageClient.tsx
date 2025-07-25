// Client component for admin messages tab
'use client';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { useEffect, useState } from 'react';
import { AdminMessagesTemplate } from '@/components/templates/AdminMessagesTemplate';

export function AdminMessagesPageClient() {
  const { start, end } = useDateRange();
  const [messagesData, setMessagesData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Placeholder: simulate async fetch
    setTimeout(() => {
      setMessagesData({
        messages: [],
        start,
        end,
      });
      setLoading(false);
    }, 500);
  }, [start, end]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading messages...</div>;
  if (error) return <div className="py-8 text-center text-destructive">{error}</div>;
  if (!messagesData) return null;

  return (
    <AdminMessagesTemplate />
  );
} 