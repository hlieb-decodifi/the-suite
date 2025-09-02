import { ReactQueryClientProvider } from './ReactQueryClientProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from './AuthProvider';
import { PostHogProvider } from './PostHogProvider/PostHogProvider';

export function Providers({ children }: React.PropsWithChildren) {
  return (
    <ReactQueryClientProvider>
      <ErrorBoundary>
        <PostHogProvider>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
      </ErrorBoundary>
    </ReactQueryClientProvider>
  );
}
