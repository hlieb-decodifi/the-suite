'use client';

import { ReactNode } from 'react'; // Keep ReactNode
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Toaster } from '@/components/ui/toaster';
// Remove unused hook import
// import { useAvatarUrl } from '@/hooks/useAvatarUrl';

export type RootLayoutTemplateProps = {
  children: ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  // Rename isLoading from authStore to avoid conflict
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  // Remove the useAvatarUrl hook call
  /*
  const { avatarUrl, isLoading: isAvatarLoading } = useAvatarUrl(
    user?.id,
    undefined, // No trigger needed here
    isAuthenticated, // Enable fetch only if authenticated
  );
  */

  // Adjust loading state: only depends on auth loading now
  const isLoading = isAuthLoading;

  if (isLoading) {
    return <LoadingOverlay />;
  }

  // Create userInfo conditionally - remove avatarUrl from here
  const userInfo =
    isAuthenticated && user
      ? {
          name:
            `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
            'User',
          email: String(user.email || ''),
          // avatarUrl is no longer needed here, UserProfileSummary gets it from store
          // ...(avatarUrl && { avatarUrl: avatarUrl }),
        }
      : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Pass userInfo without avatarUrl */}
      <Header isAuthenticated={isAuthenticated} userInfo={userInfo} />
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
      <Footer />
      <Toaster />
    </div>
  );
}
