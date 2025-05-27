import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getUserData,
  getSubscriptionPlans,
  getStripeConnectStatus,
} from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/actions';
import SubscriptionSectionClient from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/components/SubscriptionSection/SubscriptionSectionClient';

export type SubscriptionTabTemplateProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function SubscriptionTabTemplate({
  searchParams,
}: SubscriptionTabTemplateProps) {
  const supabase = await createClient();

  // Await searchParams before using
  const resolvedSearchParams = await searchParams;

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user data and subscription plans on the server
  const userData = await getUserData(user.id);
  const plans = await getSubscriptionPlans();

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
    <SubscriptionSectionClient
      userData={userData}
      plans={plans}
      connectStatus={connectStatus}
      searchParams={resolvedSearchParams}
    />
  );
}
