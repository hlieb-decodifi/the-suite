'use client';

import { ReactNode } from 'react'; // Keep ReactNode
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Toaster } from '@/components/ui/toaster';
import { useAvatarUrlQuery } from '@/api/photos/hooks';

export type RootLayoutTemplateProps = {
  children: ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: avatarUrl, isLoading: isAvatarLoading } = useAvatarUrlQuery(
    user?.id,
  );

  const isLoading = isAuthLoading || isAvatarLoading;

  if (isLoading) {
    return <LoadingOverlay />;
  }

  const userInfo =
    isAuthenticated && user
      ? {
          name:
            `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
            'User',
          email: String(user.email || ''),
          avatarUrl: avatarUrl || null,
        }
      : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Pass userInfo without avatarUrl */}
      <Header isAuthenticated={isAuthenticated} userInfo={userInfo} />
      <main className="flex flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
