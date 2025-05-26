'use server';

import { 
  getSubscriptionPlans as getDomainSubscriptionPlans,
  createCheckoutSession as createDomainCheckoutSession,
  cancelSubscription as domainCancelSubscription,
  createStripeConnectLink as domainCreateStripeConnectLink,
  getStripeConnectStatus as domainGetStripeConnectStatus
} from '@/server/domains/subscriptions/actions';
import { SubscriptionPlan } from '@/server/domains/subscriptions/db';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  isProfessional: boolean;
  subscriptionStatus: boolean | null;
  email?: string | undefined;
  subscriptionDetails?: {
    planName: string;
    nextBillingDate: string;
    status: string;
    cancelAtPeriodEnd?: boolean;
  } | undefined;
};

export async function getUserData(userId: string): Promise<UserData> {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    // Create a Supabase client
    const supabase = await createClient();
    
    // Fetch user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        role_id,
        roles(name)
      `)
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      throw new Error(`Error fetching user data: ${userError?.message || 'User not found'}`);
    }
    
    // Get user's email from the current authenticated user
    let email: string | undefined;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser?.id === userId) {
      // If requesting data for the current user, get email from authenticated user
      email = authUser.email;
    }
    // Note: We can't access auth.users directly without admin privileges
    // For non-session users, email will remain undefined which is handled by our type system
    
    // Check if user is a professional
    const { data: isProfessional, error: roleError } = await supabase
      .rpc('is_professional', { user_uuid: userId });
    
    if (roleError) {
      console.error('Error checking professional status:', roleError);
    }
    
    // If professional, fetch subscription status
    let subscriptionStatus = null;
    let subscriptionDetails = undefined;
    
    if (isProfessional) {
      const { data: profileData, error: profileError } = await supabase
        .from('professional_profiles')
        .select('is_subscribed')
        .eq('user_id', userId)
        .single();
      
      if (!profileError && profileData) {
        subscriptionStatus = profileData.is_subscribed;
        
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
              .select(`
                status,
                end_date,
                stripe_subscription_id,
                cancel_at_period_end,
                subscription_plans(name)
              `)
              .eq('professional_profile_id', profileIdData.id)
              .eq('status', 'active')
              .single();
              
            if (subData && subData.stripe_subscription_id) {
              subscriptionDetails = {
                planName: subData.subscription_plans?.name || 'Professional Plan',
                nextBillingDate: subData.end_date || new Date().toISOString(),
                status: subData.status,
                cancelAtPeriodEnd: subData.cancel_at_period_end || false
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
      email,
      subscriptionDetails
    };
  } catch (error) {
    console.error('Error in getUserData:', error);
    throw new Error('Failed to get user data');
  }
}

// Wrapper functions that call the domain layer

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return getDomainSubscriptionPlans();
}

export async function createCheckoutSession(planId: string, userId: string): Promise<string> {
  return createDomainCheckoutSession(planId, userId);
}

export async function cancelSubscription(userId: string): Promise<{ success: boolean; message: string; redirectUrl: string }> {
  return domainCancelSubscription(userId);
}

export async function createStripeConnectLink(userId: string): Promise<string> {
  return domainCreateStripeConnectLink(userId);
}

export async function getStripeConnectStatus(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
}> {
  return domainGetStripeConnectStatus(userId);
}

export async function handleSubscription(planId: string, userId: string): Promise<string> {
  return createDomainCheckoutSession(planId, userId);
}

export async function handleStripeConnect(userId: string): Promise<string> {
  return domainCreateStripeConnectLink(userId);
}

export async function handleSubscriptionRedirect(planId: string, userId: string): Promise<never> {
  const checkoutUrl = await createDomainCheckoutSession(planId, userId);
  redirect(checkoutUrl);
}

export async function handleStripeConnectRedirect(userId: string): Promise<never> {
  const redirectUrl = await domainCreateStripeConnectLink(userId);
  redirect(redirectUrl);
}

export async function handleCancelSubscriptionRedirect(userId: string): Promise<never> {
  const result = await domainCancelSubscription(userId);
  if (result.success && result.redirectUrl) {
    redirect(result.redirectUrl);
  } else {
    // Redirect back to subscription page with error
    redirect('/profile?tab=subscription&error=cancel_failed');
  }
} 