import { createClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  isActive: boolean | null;
  stripePriceId: string | null;
};

export type ProfessionalProfile = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type ProfessionalStripeConnect = {
  id: string;
  professional_profile_id: string;
  stripe_account_id?: string;
  stripe_connect_status: 'not_connected' | 'pending' | 'complete';
  stripe_connect_updated_at?: string;
  created_at: string;
  updated_at: string;
}

// Create a direct client using service role key for admin access
function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Update a subscription plan price in the database
export async function updatePlanPriceInDb(
  stripePriceId: string,
  newPrice: number
): Promise<SubscriptionPlan | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .update({
      price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_price_id', stripePriceId)
    .select();
  
  if (error) {
    console.error('Database error updating plan price:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.error(`No plan found with stripe_price_id: ${stripePriceId}`);
    return null;
  }
  
  // TypeScript doesn't understand that we've already checked data length > 0
  // So we need to assert that plan exists
  const plan = data[0];
  
  if (!plan) {
    return null;
  }
  
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    interval: plan.interval,
    isActive: plan.is_active,
    stripePriceId: plan.stripe_price_id
  };
}

// Get all active subscription plans
export async function getActivePlansFromDb(): Promise<SubscriptionPlan[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price');
  
  if (error) {
    console.error('Database error fetching subscription plans:', error);
    return [];
  }
  
  return (data || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    interval: plan.interval,
    isActive: plan.is_active,
    stripePriceId: plan.stripe_price_id
  }));
}

// Get all plans with Stripe price IDs
export async function getPlansWithStripePriceIds(): Promise<{ id: string, stripePriceId: string }[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, stripe_price_id')
    .not('stripe_price_id', 'is', null);
  
  if (error) {
    console.error('Database error fetching plans with Stripe price IDs:', error);
    return [];
  }
  
  return (data || [])
    .filter(plan => plan.stripe_price_id) // Ensure stripe_price_id is not null
    .map(plan => ({
      id: plan.id,
      stripePriceId: plan.stripe_price_id!
    }));
}

// Update Stripe Connect status in database
export async function updateStripeConnectStatus(
  userId: string,
  status: {
    accountId?: string;
    connectStatus: 'not_connected' | 'pending' | 'complete';
  }
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = createAdminClient();
  try {
    // First get the professional profile ID
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('Professional profile not found for user:', userId);
      return { success: false, error: 'Professional profile not found' };
    }

    // Update or create Stripe Connect record in the secure table
    const { error } = await supabaseAdmin
      .from('professional_stripe_connect')
      .upsert({
        professional_profile_id: profileData.id,
        stripe_account_id: status.accountId || null,
        stripe_connect_status: status.connectStatus,
        stripe_connect_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'professional_profile_id'
      });

    if (error) {
      console.error('Error updating Stripe Connect status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateStripeConnectStatus:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get Stripe Connect status from database
export async function getStripeConnectStatusFromDb(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null> {
  const supabaseAdmin = createAdminClient();
  try {
    const { data, error } = await supabaseAdmin
      .from('professional_stripe_connect')
      .select(`
        stripe_account_id,
        stripe_connect_status,
        professional_profiles!inner(user_id)
      `)
      .eq('professional_profiles.user_id', userId)
      .single();

    if (error || !data) {
      // If no record exists, return default values
      return {
        isConnected: false,
        connectStatus: 'not_connected'
      };
    }

    const result: {
      isConnected: boolean;
      accountId?: string;
      connectStatus?: string;
    } = {
      isConnected: !!data.stripe_account_id,
      connectStatus: data.stripe_connect_status
    };

    // Only add accountId if it exists
    if (data.stripe_account_id) {
      result.accountId = data.stripe_account_id;
    }

    return result;
  } catch (error) {
    console.error('Error getting Stripe Connect status from DB:', error);
    return null;
  }
} 