import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileLayoutClient } from './ProfileLayoutClient';
import {
  getUserData,
  getStripeConnectStatus,
} from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/actions';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if user is professional
  const userRole = user.user_metadata?.role;
  if (userRole !== 'professional') {
    redirect('/dashboard');
  }

  // Fetch user data on the server
  const userData = await getUserData(user.id);

  // Get Stripe Connect status if user is subscribed
  let connectStatus = null;
  if (userData.isProfessional && userData.subscriptionStatus) {
    try {
      connectStatus = await getStripeConnectStatus(user.id);
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  }

  return (
    <ProfileLayoutClient
      user={user}
      userData={userData}
      connectStatus={connectStatus}
    >
      {children}
    </ProfileLayoutClient>
  );
}
