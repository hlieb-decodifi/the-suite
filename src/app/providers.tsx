'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import { PostHogProvider } from '@/providers/PostHogProvider/PostHogProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - good for profile data
            gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache longer
            retry: 1,
            refetchOnWindowFocus: false, // Reduce unnecessary refetches
            refetchOnMount: false, // Use cached data if available and not stale
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
