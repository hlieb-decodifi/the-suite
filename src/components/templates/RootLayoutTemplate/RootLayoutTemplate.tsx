'use client';

import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { useAuthStore } from '@/stores/authStore';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export type RootLayoutTemplateProps = {
  children: React.ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading overlay while authentication state is being determined
  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex min-h-screen flex-col relative">
      <Header isAuthenticated={isAuthenticated} />
      <main className="flex flex-1 justify-center items-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}
