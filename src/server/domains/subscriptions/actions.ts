'use server';

import Stripe from 'stripe';
import { 
  updatePlanPriceInDb, 
  getActivePlansFromDb, 
  getPlansWithStripePriceIds,
  getStripeConnectStatusFromDb,
  updateStripeConnectStatus
} from './db';
import type { SubscriptionPlan } from './db';
import { createClient } from '@/lib/supabase/server';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Fetch active subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    return await getActivePlansFromDb();
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
}

// Synchronize a Stripe price with our database
export async function syncStripePriceWithDatabase(price: Stripe.Price): Promise<boolean> {
  if (!price.unit_amount) {
    console.error(`Price ${price.id} has no unit_amount`);
    return false;
  }
  
  // Convert from cents to dollars
  const priceInDollars = price.unit_amount / 100;
  
  try {
    const updatedPlan = await updatePlanPriceInDb(price.id, priceInDollars);
    return !!updatedPlan;
  } catch (error) {
    console.error('Error syncing Stripe price with database:', error);
    return false;
  }
}

// This function is used as a backup for on-demand syncing of prices
export async function syncAllStripePrices() {
  try {
    // Get all subscription plans that have a stripe_price_id
    const plans = await getPlansWithStripePriceIds();
    
    if (plans.length === 0) {
      return { success: true, message: 'No plans with Stripe price IDs found' };
    }
    
    // Sync each price with Stripe
    const results = await Promise.all(
      plans.map(async (plan) => {        
        try {
          // Fetch the current price from Stripe
          const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);
          
          // Sync the price with our database
          const success = await syncStripePriceWithDatabase(stripePrice);
          return { success };
        } catch (error) {
          console.error(`Error syncing price for plan ${plan.id}:`, error);
          return { success: false };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    
    return { 
      success: true, 
      message: `Successfully synced ${successCount} of ${plans.length} prices`
    };
  } catch (error) {
    console.error('Error in syncAllStripePrices:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// This function ensures prices are up to date when displaying them
export async function getSubscriptionPlansWithVerifiedPrices(): Promise<SubscriptionPlan[]> {
  try {
    // Get all active subscription plans
    const plans = await getActivePlansFromDb();
    
    // For demonstration purposes, we'll sync all plans that have Stripe IDs
    // In production, you would want to check the last_updated timestamp
    const plansWithStripeIds = plans.filter(plan => 
      plan.stripePriceId && 
      plan.stripePriceId.length > 0
    );
    
    // If we have plans with Stripe IDs, sync them before returning
    if (plansWithStripeIds.length > 0) {
      await syncAllStripePrices();
      
      // Fetch the updated plans
      return await getActivePlansFromDb();
    }
    
    // Return the plans
    return plans;
  } catch (error) {
    console.error('Error in getSubscriptionPlansWithVerifiedPrices:', error);
    // Return empty array to avoid breaking the UI
    return [];
  }
}

// Create a Stripe checkout session for subscription
export async function createCheckoutSession(planId: string, userId: string): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key');
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('Missing base URL');
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  });

  // Get the plan details
  const plans = await getActivePlansFromDb();
  const selectedPlan = plans.find(plan => plan.id === planId);

  if (!selectedPlan || !selectedPlan.stripePriceId) {
    throw new Error('Invalid plan or missing Stripe price ID');
  }
  
  // Get user details with authenticated user verification
  const supabase = await createClient();
  
  // Get authenticated user directly from the Auth server
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  // Verify that the current user is the one subscribing
  if (!authUser) {
    throw new Error('Authentication required to subscribe');
  }
  
  if (authUser.id !== userId) {
    throw new Error('Unauthorized: You can only subscribe for your own account');
  }
  
  const email = authUser.email;
  
  if (!email) {
    throw new Error('User email not found. Please ensure you are logged in.');
  }

  // Create a checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: selectedPlan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/subscription?success=subscription&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/subscription`,
    client_reference_id: userId,
    customer_email: email, // Pre-fill and disable email field
    metadata: {
      userId,
      planId,
      description: `Subscription to ${selectedPlan.name}`
    },
    // Pre-fill name but allow editing
    billing_address_collection: 'auto',
  });

  if (!checkoutSession.url) {
    throw new Error('Failed to create checkout session');
  }

  return checkoutSession.url;
}

// Cancel a subscription
export async function cancelSubscription(userId: string): Promise<{ success: boolean; message: string; redirectUrl: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key');
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });

    // Create a Supabase client
    const supabase = await createClient();
    
    // Get authenticated user to verify authorization
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Verify that the current user is the one unsubscribing
    if (!authUser) {
      throw new Error('Authentication required to manage subscription');
    }
    
    if (authUser.id !== userId) {
      throw new Error('Unauthorized: You can only manage your own subscription');
    }
    
    // 1. Get the professional profile ID for this user
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (profileError || !profileData) {
      throw new Error('Professional profile not found');
    }
    
    // 2. Get the active subscription for this profile
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('professional_subscriptions')
      .select('stripe_subscription_id')
      .eq('professional_profile_id', profileData.id)
      .eq('status', 'active')
      .single();
      
    if (subscriptionError || !subscriptionData?.stripe_subscription_id) {
      throw new Error('Active subscription not found');
    }
    
    // 3. Cancel the subscription in Stripe (at period end)
    await stripe.subscriptions.update(subscriptionData.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    
    // 4. Update our database to reflect this change
    // Keep status as 'active' since it's still active until period end
    // But update the cancel_at_period_end flag
    const { data: updateData, error: updateError } = await supabase
      .from('professional_subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionData.stripe_subscription_id);
      
    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log('Subscription marked for cancellation:', { 
      stripe_id: subscriptionData.stripe_subscription_id,
      update_result: updateData 
    });
    
    return { 
      success: true, 
      message: 'Your subscription has been scheduled to cancel at the end of your current billing period. You will continue to have access until then.',
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/subscription?success=cancel`
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      redirectUrl: ''
    };
  }
}

// Create a Stripe Connect link
export async function createStripeConnectLink(userId: string): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key');
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error('Missing base URL');
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });

    // Create a Supabase client
    const supabase = await createClient();
    
    // Get authenticated user to verify authorization
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Verify that the current user is requesting their own connect link
    if (!authUser) {
      throw new Error('Authentication required to connect with Stripe');
    }
    
    if (authUser.id !== userId) {
      throw new Error('Unauthorized: You can only connect your own account');
    }
    
    // Get the user's email
    const userEmail = authUser.email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }
    
    // Get the professional profile
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, is_subscribed')
      .eq('user_id', userId)
      .single();
      
    if (profileError || !profileData) {
      throw new Error('Professional profile not found');
    }
    
    // Check if the user has an active subscription
    if (!profileData.is_subscribed) {
      throw new Error('Active subscription required to connect with Stripe');
    }
    
    // Check if we have a stored Stripe account ID in our database first
    const { data: existingConnectData } = await supabase
      .from('professional_profiles')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();
    
    let account;
    
    // If we have a stored account ID, try to retrieve it directly
    if (existingConnectData?.stripe_account_id) {
      try {
        account = await stripe.accounts.retrieve(existingConnectData.stripe_account_id);
        console.log('Retrieved existing Stripe account from DB:', account.id);
      } catch (error) {
        console.log('Stored account ID invalid, will create new account:', error);
        // Account might have been deleted, continue to create new one
      }
    }
    
    // Fallback: search for existing account by metadata (only if no stored ID)
    if (!account) {
      const existingAccounts = await stripe.accounts.list({
        limit: 10, // Limit to most recent accounts
      });
      
      const existingAccount = existingAccounts.data.find(acc => 
        acc.metadata?.userId === userId || 
        acc.metadata?.professionalProfileId === profileData.id
      );
      
      if (existingAccount) {
        account = existingAccount;
        // Store the account ID in our database for future use
        await supabase
          .from('professional_profiles')
          .update({ stripe_account_id: account.id })
          .eq('user_id', userId);
        console.log('Found and stored existing Stripe account:', account.id);
      }
    }
    
    if (!account) {
      // Generate a unique account ID based on the user's profile ID
      const accountIdKey = `stripe_connect_${profileData.id}`;
      
      // Create a new account
      account = await stripe.accounts.create({
        type: 'custom',
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId,
          professionalProfileId: profileData.id,
          accountIdKey
        }
      });
      
      // Store the new account ID in our database
      await supabase
        .from('professional_profiles')
        .update({ stripe_account_id: account.id })
        .eq('user_id', userId);
      
      console.log('Created and stored new Stripe account:', account.id);
    }
    
    // Create an account link for onboarding - this will allow the user to continue
    // from where they left off
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/subscription?refresh=true&message=Please%20complete%20your%20Stripe%20setup`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/subscription?stripe_return=true&completed=true`,
      type: 'account_onboarding',
      collect: 'currently_due' // Only collect what's immediately needed for faster onboarding
    });
    
    // Update database with initial account creation
    await updateStripeConnectStatus(userId, {
      accountId: account.id,
      connectStatus: account.charges_enabled ? 'complete' : 'pending'
    });
    
    return accountLink.url;
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create Stripe Connect link');
  }
}

// Get Stripe Connect status
export async function getStripeConnectStatus(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
}> {
  try {
    // First, try to get status from database (fast)
    const dbStatus = await getStripeConnectStatusFromDb(userId);
    
    if (dbStatus) {
      // If we have recent data in DB (less than 1 hour old), use it
      const supabase = await createClient();
      const { data: profileData } = await supabase
        .from('professional_profiles')
        .select('stripe_connect_updated_at')
        .eq('user_id', userId)
        .single();
        
      if (profileData?.stripe_connect_updated_at) {
        const lastUpdate = new Date(profileData.stripe_connect_updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (lastUpdate > oneHourAgo) {
          return dbStatus;
        }
      }
    }
    
    // Fallback to Stripe API for real-time data or if DB data is stale
    return await getStripeConnectStatusFromAPI(userId);
  } catch (error) {
    console.error('Error getting Stripe Connect status:', error);
    return { isConnected: false };
  }
}

// Get fresh status from Stripe API and update database
async function getStripeConnectStatusFromAPI(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
}> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key');
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });

    // Create a Supabase client
    const supabase = await createClient();
    
    // Get authenticated user to verify authorization
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Verify that the current user is requesting their own connect status
    if (!authUser) {
      throw new Error('Authentication required to check Stripe Connect status');
    }
    
    if (authUser.id !== userId) {
      throw new Error('Unauthorized: You can only check your own Stripe Connect status');
    }
    
    // Get the professional profile
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (profileError || !profileData) {
      throw new Error('Professional profile not found');
    }
    
    // List accounts that match our user's metadata
    const accounts = await stripe.accounts.list({
      limit: 5, // Limit to recent accounts
    });
    
    // Find account with matching metadata
    const matchingAccount = accounts.data.find(account => 
      account.metadata?.userId === userId || 
      account.metadata?.professionalProfileId === profileData.id
    );
    
    const result: {
      isConnected: boolean;
      accountId?: string;
      connectStatus?: string;
    } = {
      isConnected: !!matchingAccount,
      connectStatus: matchingAccount?.charges_enabled ? 'complete' : (matchingAccount ? 'pending' : 'not_connected'),
    };
    
    // Only add accountId if it exists
    if (matchingAccount?.id) {
      result.accountId = matchingAccount.id;
    }
    
    // Update database with fresh data
    if (matchingAccount) {
      await updateStripeConnectStatus(userId, {
        accountId: matchingAccount.id,
        connectStatus: result.connectStatus as 'not_connected' | 'pending' | 'complete'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error checking Stripe Connect status from API:', error);
    return { isConnected: false };
  }
} 