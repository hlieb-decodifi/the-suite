import { User } from '@supabase/supabase-js';
import { 
  getUserData, 
  getSubscriptionPlans, 
  getStripeConnectStatus,
  type UserData
} from '../../actions';
import type { SubscriptionPlan } from '@/server/domains/subscriptions/db';
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export type SubscriptionSectionProps = {
  user: User;
  userId: string;
  searchParams?: { [key: string]: string | string[] | undefined };
};

type ConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null;

type SubscriptionSectionClientProps = {
  userData: UserData;
  plans: SubscriptionPlan[];
  connectStatus: ConnectStatus;
  searchParams: { [key: string]: string | string[] | undefined };
};

// Dynamic import for client component
const SubscriptionSectionClient = dynamic(
  () => import('./SubscriptionSectionClient')
) as ComponentType<SubscriptionSectionClientProps>;

// Server component wrapper
export async function SubscriptionSection({
  userId,
  searchParams = {},
}: SubscriptionSectionProps) {
  // Fetch user data and subscription plans on the server
  const userData = await getUserData(userId);
  const plans = await getSubscriptionPlans();

  // Get Stripe Connect status if user is subscribed
  let connectStatus = null;
  if (userData.isProfessional && userData.subscriptionStatus) {
    try {
      connectStatus = await getStripeConnectStatus(userId);
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  }

  return (
    <SubscriptionSectionClient 
      userData={userData}
      plans={plans}
      connectStatus={connectStatus}
      searchParams={searchParams}
    />
  );
}
