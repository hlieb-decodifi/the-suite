'use client';

import { useEffect, useState } from 'react';

export function PostHogDashboard() {
  const [height, setHeight] = useState(1150);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChange = (e: any) => {
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

  const postHogDashboardUrl = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL;

  if (!postHogDashboardUrl) {
    return (
      <div className="bg-card border rounded-lg p-4 text-center">
        <p className="text-muted-foreground">
          PostHog dashboard URL not configured. Please set NEXT_PUBLIC_POSTHOG_DASHBOARD_URL environment variable.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-1">
      <iframe
        width="100%"
        height={height}
        allowFullScreen
        src={postHogDashboardUrl}
        className="rounded-md border-none"
        title="Website Analytics Dashboard"
      />
    </div>
  );
}

