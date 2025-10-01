import { createClient } from '@/lib/supabase/server';

/**
 * Check if a professional has an active subscription
 * This replaces the deprecated is_subscribed field which was removed for security
 */
export async function checkProfessionalSubscription(
  professionalProfileId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('professional_subscriptions')
    .select('status, end_date')
    .eq('professional_profile_id', professionalProfileId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return false;
  }

  // Check if subscription is still valid (not expired)
  if (data.end_date && new Date(data.end_date) <= new Date()) {
    return false;
  }

  return true;
}

/**
 * Check if a professional (by user ID) has an active subscription
 * Uses the secure RPC function that bypasses RLS
 */
export async function checkProfessionalSubscriptionByUserId(
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: isSubscribed, error } = await supabase.rpc(
    'is_professional_user_subscribed',
    { prof_user_id: userId }
  );

  if (error) {
    console.error('Error checking professional subscription:', error);
    return false;
  }

  return !!isSubscribed;
}

/**
 * Get subscription details for a professional
 */
export async function getProfessionalSubscriptionDetails(
  professionalProfileId: string
): Promise<{
  isSubscribed: boolean;
  subscriptionDetails?: {
    planName: string;
    nextBillingDate: string;
    status: string;
    cancelAtPeriodEnd: boolean;
  };
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('professional_subscriptions')
    .select(`
      status,
      end_date,
      stripe_subscription_id,
      cancel_at_period_end,
      subscription_plans(name)
    `)
    .eq('professional_profile_id', professionalProfileId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return { isSubscribed: false };
  }

  // Check if subscription is still valid (not expired)
  const isActive = !data.end_date || new Date(data.end_date) > new Date();

  if (!isActive) {
    return { isSubscribed: false };
  }

  return {
    isSubscribed: true,
    subscriptionDetails: {
      planName: (data.subscription_plans as { name: string } | null)?.name || 'Professional Plan',
      nextBillingDate: data.end_date || new Date().toISOString(),
      status: data.status,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
    },
  };
}
