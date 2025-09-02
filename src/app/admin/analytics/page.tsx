'use client';

import { Typography } from '@/components/ui/typography';
import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [height, setHeight] = useState(1150);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChange = (e: any) => {
      console.log('e', e.data.event, e.data.height);
      if (
        e.data.event === 'posthog:dimensions' &&
        e.data.name === 'MyPostHogIframe'
      ) {
        setHeight(e.data.height);
      }
    };
    window.addEventListener('message', onChange);
    return () => window.removeEventListener('message', onChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Typography variant="h2">Analytics</Typography>

      {/* PostHog Analytics Iframe */}
      <div className="bg-card border rounded-lg p-1">
        <iframe
          width="100%"
          height={height}
          allowFullScreen
          src="https://us.posthog.com/embedded/b-BnKIsBt7xUg_cL3beFhup5aTW-Gg"
          className="rounded-md border-none"
          title="Website Analytics Dashboard"
        />
      </div>
    </div>
  );
}
