import { User } from '@supabase/supabase-js';
import {
  getUserData,
  getStripeConnectStatus,
  getSubscriptionPlans,
} from './actions';
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

  // Fetch subscription plans for the subscription section
  let subscriptionPlans = null;
  if (!isPublicView && userData.isProfessional) {
    try {
      subscriptionPlans = await getSubscriptionPlans();
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      subscriptionPlans = [];
    }
  }

  return (
    <ProfessionalProfileViewClient
      user={user}
      userData={userData}
      connectStatus={connectStatus}
      subscriptionPlans={subscriptionPlans}
      searchParams={searchParams}
      isPublicView={isPublicView}
    />
  );
}
