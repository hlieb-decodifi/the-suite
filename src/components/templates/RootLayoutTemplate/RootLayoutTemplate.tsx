import { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { fetchProfilePhotoUrlServer } from '@/api/photos/server-fetchers';
import { Header, type UserInfo } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Toaster } from '@/components/ui/toaster';
import { AuthSyncWrapper } from './components/AuthSyncWrapper';
import {
  getUnreadMessagesCount,
  getUnreadSupportMessagesCount,
} from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';
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
  let unreadSupportRequestsCount = 0;

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

    // Fetch unread support requests count
    unreadSupportRequestsCount = await getUnreadSupportMessagesCount(user.id);

    // Fetch user's first and last name from the database
    let firstName = '';
    let lastName = '';
    let isAdmin = false;

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

      // Fetch user role separately
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userRoleData) {
        isAdmin = userRoleData.role === 'admin';
      }
    } catch (error) {
      console.error('Error fetching user name/role from database:', error);
      // Fallback to metadata if database fetch fails
      firstName = user.user_metadata?.first_name || '';
      lastName = user.user_metadata?.last_name || '';
      isAdmin = false;
    }

    userInfo = {
      name: `${firstName} ${lastName}`.trim() || 'User',
      email: user.email || '',
      avatarUrl,
      isAdmin,
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
          unreadSupportRequestsCount={unreadSupportRequestsCount}
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
