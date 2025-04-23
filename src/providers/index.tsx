import { ReactQueryClientProvider } from './ReactQueryClientProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function Providers({ children }: React.PropsWithChildren) {
  return (
    <ReactQueryClientProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ReactQueryClientProvider>
  );
}
