'use client';

// import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
// import { usePostHog } from 'posthog-js/react';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog if we have a valid key
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!posthogKey) {
      console.log('PostHog key not found. Analytics will not be initialized.');
      return;
    }

    posthog.init(posthogKey, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'always',
      capture_pageview: false, // Disable automatic pageview capture, we'll do it manually
      capture_pageleave: true, // Capture when user leaves the page
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
