'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSubscriptionPageClient } from './ProfileSubscriptionPageClient';
import type { SubscriptionPlan } from '@/server/domains/subscriptions/db';
import {
  getSubscriptionPlans as getDomainSubscriptionPlans,
  createCheckoutSession as createDomainCheckoutSession,
  cancelSubscription as domainCancelSubscription,
  createStripeConnectLink as domainCreateStripeConnectLink,
  getStripeConnectStatus as domainGetStripeConnectStatus,
} from '@/server/domains/subscriptions/actions';

export type ProfileSubscriptionPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  isProfessional: boolean;
  subscriptionStatus: boolean | null;
  isPublished: boolean | null;
  email?: string | undefined;
  subscriptionDetails?:
    | {
        planName: string;
        nextBillingDate: string;
        status: string;
        cancelAtPeriodEnd?: boolean;
      }
    | undefined;
};

type ConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null;

export async function ProfileSubscriptionPage({
  searchParams = {},
}: ProfileSubscriptionPageProps) {
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

  // Fetch subscription data on the server
  const subscriptionResult = await getSubscriptionData(user.id);

  return (
    <ProfileSubscriptionPageClient
      userData={subscriptionResult.userData}
      plans={subscriptionResult.plans}
      connectStatus={subscriptionResult.connectStatus}
      searchParams={searchParams}
    />
  );
}

// Server actions for this page
export async function getSubscriptionData(userId: string) {
  try {
    // Fetch user data and subscription plans
    const userData = await getUserData(userId);
    const plans = await getSubscriptionPlans();

    // Get Stripe Connect status if user is subscribed
    let connectStatus: ConnectStatus = null;
    if (userData.isProfessional && userData.subscriptionStatus) {
      try {
        connectStatus = await getStripeConnectStatus(userId);
      } catch (error) {
        console.error('Error fetching Stripe Connect status:', error);
      }
    }

    return {
      userData,
      plans,
      connectStatus,
    };
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return {
      userData: {
        id: userId,
        firstName: '',
        lastName: '',
        roleName: 'User',
        isProfessional: false,
        subscriptionStatus: null,
        isPublished: null,
      } as UserData,
      plans: [] as SubscriptionPlan[],
      connectStatus: null as ConnectStatus,
    };
  }
}

export async function handleSubscriptionRedirectAction({
  planId,
  userId,
}: {
  planId: string;
  userId: string;
}) {
  const checkoutUrl = await createDomainCheckoutSession(planId, userId);
  redirect(checkoutUrl);
}

export async function handleStripeConnectRedirectAction({
  userId,
}: {
  userId: string;
}) {
  const redirectUrl = await createStripeConnectLink(userId);
  redirect(redirectUrl);
}

export async function handleCancelSubscriptionRedirectAction({
  userId,
}: {
  userId: string;
}) {
  const result = await cancelSubscription(userId);
  if (result.success && result.redirectUrl) {
    redirect(result.redirectUrl);
  } else {
    // Redirect back to subscription page with error
    redirect('/profile/subscription?error=cancel_failed');
  }
}

// Local server action implementations
async function getUserData(userId: string): Promise<UserData> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Fetch user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        first_name,
        last_name,
        role_id,
        roles(name)
      `,
      )
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error(
        `Error fetching user data: ${userError?.message || 'User not found'}`,
      );
    }

    // Get user's email from the current authenticated user
    let email: string | undefined;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.id === userId) {
      // If requesting data for the current user, get email from authenticated user
      email = authUser.email;
    }

    // Check if user is a professional
    const { data: isProfessional, error: roleError } = await supabase.rpc(
      'is_professional',
      { user_uuid: userId },
    );

    if (roleError) {
      console.error('Error checking professional status:', roleError);
    }

    // If professional, fetch subscription status and publish status
    let subscriptionStatus = null;
    let isPublished = null;
    let subscriptionDetails = undefined;

    if (isProfessional) {
      const { data: profileData, error: profileError } = await supabase
        .from('professional_profiles')
        .select('is_subscribed, is_published')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData) {
        subscriptionStatus = profileData.is_subscribed;
        isPublished = profileData.is_published;

        // If subscribed, check if we have professional_subscriptions record
        if (subscriptionStatus) {
          // Get professional profile ID
          const { data: profileIdData } = await supabase
            .from('professional_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (profileIdData) {
            // Look for active subscription in our database
            const { data: subData } = await supabase
              .from('professional_subscriptions')
              .select(
                `
                status,
                end_date,
                stripe_subscription_id,
                cancel_at_period_end,
                subscription_plans(name)
              `,
              )
              .eq('professional_profile_id', profileIdData.id)
              .eq('status', 'active')
              .single();

            if (subData && subData.stripe_subscription_id) {
              subscriptionDetails = {
                planName:
                  subData.subscription_plans?.name || 'Professional Plan',
                nextBillingDate: subData.end_date || new Date().toISOString(),
                status: subData.status,
                cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              };
            }
          }
        }
      }
    }

    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roleName: userData.roles?.name || 'User',
      isProfessional: !!isProfessional,
      subscriptionStatus,
      isPublished,
      email,
      subscriptionDetails,
    };
  } catch (error) {
    console.error('Error in getUserData:', error);
    throw new Error('Failed to get user data');
  }
}

async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return getDomainSubscriptionPlans();
}

async function createStripeConnectLink(userId: string): Promise<string> {
  return domainCreateStripeConnectLink(userId);
}

async function getStripeConnectStatus(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
}> {
  return domainGetStripeConnectStatus(userId);
}

async function cancelSubscription(
  userId: string,
): Promise<{ success: boolean; message: string; redirectUrl: string }> {
  return domainCancelSubscription(userId);
}
