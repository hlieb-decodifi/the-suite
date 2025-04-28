'use client';

import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { useAuthStore } from '@/stores/authStore';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export type RootLayoutTemplateProps = {
  children: React.ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Show loading overlay while authentication state is being determined
  if (isLoading) {
    return <LoadingOverlay />;
  }

  // Only create userInfo when the user is authenticated
  const userInfo:
    | {
        name: string;
        email: string;
        avatarUrl?: string;
      }
    | undefined =
    isAuthenticated && user
      ? {
          name: `${user.user_metadata.first_name} ${user.user_metadata.last_name}`,
          email: String(user.email || ''),
          avatarUrl: user.user_metadata?.avatar_url,
        }
      : undefined;

  return (
    <div className="flex min-h-screen flex-col relative">
      <Header isAuthenticated={isAuthenticated} userInfo={userInfo} />
      <main className="flex flex-1 justify-center items-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}
