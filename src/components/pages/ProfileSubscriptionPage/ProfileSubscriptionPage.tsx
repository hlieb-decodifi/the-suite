'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfessionalSubscriptionDetails } from '@/utils/subscriptionUtils';
import { ProfileSubscriptionPageClient } from './ProfileSubscriptionPageClient';
import type { SubscriptionPlan } from '@/server/domains/subscriptions/db';
import {
  getSubscriptionPlans as getDomainSubscriptionPlans,
  createCheckoutSession as createDomainCheckoutSession,
  cancelSubscription as domainCancelSubscription,
  createStripeConnectLink as domainCreateStripeConnectLink,
  getStripeConnectStatus as domainGetStripeConnectStatus,
} from '@/server/domains/subscriptions/actions';
// Import Stripe service synchronization
import { onSubscriptionChangeAction } from '@/server/domains/stripe-services';

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
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    disabled_reason?: string | null;
  };
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

  // Check if user is professional from database instead of metadata
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  if (!isProfessional) {
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

export async function preloadStripeConnectLinkAction({
  userId,
}: {
  userId: string;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const redirectUrl = await createStripeConnectLink(userId);
    return { success: true, url: redirectUrl };
  } catch (error) {
    console.error('Error preloading Stripe Connect link:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to preload Stripe Connect link',
    };
  }
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

/**
 * Enhanced subscription action that includes Stripe service sync
 * Called after successful subscription webhook processing
 */
export async function onSubscriptionStatusChangeAction({
  userId,
}: {
  userId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Trigger Stripe service synchronization
    const syncResult = await onSubscriptionChangeAction(userId);

    if (syncResult.success) {
      return {
        success: true,
        message: `Subscription updated and ${syncResult.syncResult?.successCount || 0} services synced with Stripe`,
      };
    } else {
      console.error(
        'Stripe service sync failed after subscription change:',
        syncResult.message,
      );
      // Don't fail the subscription change, just log the sync error
      return {
        success: true,
        message: 'Subscription updated, but service sync encountered issues',
      };
    }
  } catch (error) {
    console.error('Error in onSubscriptionStatusChangeAction:', error);
    return {
      success: true, // Don't fail subscription change due to sync issues
      message: 'Subscription updated, but service sync failed',
    };
  }
}

/**
 * Enhanced Stripe Connect action that includes service sync
 * Called after successful Stripe Connect completion
 */
export async function onStripeConnectStatusChangeAction({
  userId,
}: {
  userId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Trigger Stripe service synchronization
    const syncResult = await onSubscriptionChangeAction(userId);

    if (syncResult.success) {
      return {
        success: true,
        message: `Stripe Connect updated and ${syncResult.syncResult?.successCount || 0} services synced`,
      };
    } else {
      console.error(
        'Stripe service sync failed after Connect status change:',
        syncResult.message,
      );
      return {
        success: false,
        message: 'Stripe Connect updated, but service sync encountered issues',
      };
    }
  } catch (error) {
    console.error('Error in onStripeConnectStatusChangeAction:', error);
    return {
      success: false,
      message: 'Failed to sync services after Stripe Connect update',
    };
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
        last_name
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

    // Check user roles using RPC functions (these bypass RLS as they are security definer)
    const { data: isProfessional, error: professionalError } =
      await supabase.rpc('is_professional', { user_uuid: userId });

    const { data: isClient, error: clientError } = await supabase.rpc(
      'is_client',
      { user_uuid: userId },
    );

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_admin',
      { user_uuid: userId },
    );

    if (professionalError) {
      console.error('Error checking professional status:', professionalError);
    }
    if (clientError) {
      console.error('Error checking client status:', clientError);
    }
    if (adminError) {
      console.error('Error checking admin status:', adminError);
    }

    console.log('Role checks:', { isProfessional, isClient, isAdmin });

    // If professional, fetch subscription status and publish status
    let subscriptionStatus = null;
    let isPublished = null;
    let subscriptionDetails = undefined;

    if (isProfessional) {
      const { data: profileData, error: profileError } = await supabase
        .from('professional_profiles')
        .select('id, is_published')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData) {
        isPublished = profileData.is_published;

        // Check subscription status using the new utility function
        const subscriptionResult = await getProfessionalSubscriptionDetails(
          profileData.id,
        );
        subscriptionStatus = subscriptionResult.isSubscribed;
        subscriptionDetails = subscriptionResult.subscriptionDetails;
      }
    }

    // Determine role name based on RPC function results
    let roleName = 'User'; // default fallback
    if (isAdmin) {
      roleName = 'admin';
    } else if (isProfessional) {
      roleName = 'professional';
    } else if (isClient) {
      roleName = 'client';
    }

    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roleName,
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
