import { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { fetchProfilePhotoUrlServer } from '@/api/photos/server-fetchers';
import { Header, type UserInfo } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Toaster } from '@/components/ui/toaster';
import { AuthSyncWrapper } from './components/AuthSyncWrapper';

export type RootLayoutTemplateProps = {
  children: ReactNode;
};

export async function RootLayoutTemplate({
  children,
}: RootLayoutTemplateProps) {
  // Fetch auth data on the server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userInfo: UserInfo | null = null;

  if (user) {
    // Fetch avatar URL on the server
    const avatarUrl = await fetchProfilePhotoUrlServer(user.id);

    userInfo = {
      name:
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        'User',
      email: user.email || '',
      avatarUrl,
    };
  }

  return (
    <AuthSyncWrapper user={user} userInfo={userInfo}>
      <div className="flex flex-col min-h-screen">
        <Header isAuthenticated={!!user} userInfo={userInfo} />
        <main className="flex flex-grow container mx-auto py-8">
          {children}
        </main>
        <Footer />
        <Toaster />
      </div>
    </AuthSyncWrapper>
  );
}
