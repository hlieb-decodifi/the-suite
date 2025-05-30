import { ReactQueryClientProvider } from './ReactQueryClientProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from './AuthProvider';

export function Providers({ children }: React.PropsWithChildren) {
  return (
    <ReactQueryClientProvider>
      <ErrorBoundary>
        <AuthProvider>{children}</AuthProvider>
      </ErrorBoundary>
    </ReactQueryClientProvider>
  );
}
