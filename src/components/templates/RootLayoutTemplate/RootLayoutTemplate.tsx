import { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { fetchProfilePhotoUrlServer } from '@/api/photos/server-fetchers';
import { Header, type UserInfo } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Toaster } from '@/components/ui/toaster';
import { AuthSyncWrapper } from './components/AuthSyncWrapper';
import { getUnreadMessagesCount } from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';
import { CookieConsent } from '@/components/common/CookieConsent';

export type RootLayoutTemplateProps = {
  children: ReactNode;
};

// Enable revalidation every 5 minutes for message counts
export const revalidate = 300;

export async function RootLayoutTemplate({
  children,
}: RootLayoutTemplateProps) {
  // Fetch auth data on the server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userInfo: UserInfo | null = null;
  let isProfessional = false;
  let unreadMessagesCount = 0;

  if (user) {
    // Check if user is a professional
    const { data: professionalCheck } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });
    isProfessional = !!professionalCheck;

    // Fetch avatar URL on the server
    const avatarUrl = await fetchProfilePhotoUrlServer(user.id);

    // Fetch unread messages count
    unreadMessagesCount = await getUnreadMessagesCount(user.id);

    // Fetch user's first and last name from the database
    let firstName = '';
    let lastName = '';

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (userData) {
        firstName = userData.first_name || '';
        lastName = userData.last_name || '';
      }
    } catch (error) {
      console.error('Error fetching user name from database:', error);
      // Fallback to metadata if database fetch fails
      firstName = user.user_metadata?.first_name || '';
      lastName = user.user_metadata?.last_name || '';
    }

    userInfo = {
      name: `${firstName} ${lastName}`.trim() || 'User',
      email: user.email || '',
      avatarUrl,
    };
  }

  return (
    <AuthSyncWrapper user={user} userInfo={userInfo}>
      <div className="flex flex-col min-h-screen">
        <Header
          isAuthenticated={!!user}
          userInfo={userInfo}
          isProfessional={isProfessional}
          unreadMessagesCount={unreadMessagesCount}
        />
        <main className="flex flex-grow container mx-auto py-8">
          {children}
        </main>
        <Footer />
        <CookieConsent />
        <Toaster />
      </div>
    </AuthSyncWrapper>
  );
}
