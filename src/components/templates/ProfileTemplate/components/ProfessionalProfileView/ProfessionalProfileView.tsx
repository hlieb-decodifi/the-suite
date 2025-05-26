import { User } from '@supabase/supabase-js';
import { getUserData, getStripeConnectStatus } from './actions';
import { ProfessionalProfileViewClient } from './ProfessionalProfileViewClient';

export type ProfessionalProfileViewProps = {
  user: User;
  searchParams?: { [key: string]: string | string[] | undefined };
  isPublicView?: boolean;
};

export async function ProfessionalProfileView({
  user,
  searchParams = {},
  isPublicView = false,
}: ProfessionalProfileViewProps) {
  // Fetch user data and subscription status
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
    <ProfessionalProfileViewClient
      user={user}
      userData={userData}
      connectStatus={connectStatus}
      searchParams={searchParams}
      isPublicView={isPublicView}
    />
  );
}
