import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updatePlanPriceInDb, updateStripeConnectStatus } from '@/server/domains/subscriptions/db';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';

// Configure this API route to use Node.js Runtime for email functionality
export const runtime = 'nodejs';

// Simple GET endpoint for testing
export async function GET() {
  return new NextResponse(JSON.stringify({ 
    status: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Extended interface for Stripe Subscription with period fields
type StripeSubscriptionWithPeriod = {
  current_period_start: number;
  current_period_end: number;
} & Stripe.Subscription

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

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

// Webhook endpoint for Stripe events
export async function POST(req: Request) {
  console.log('🔄 Webhook POST request received');
  
  const body = await req.text();
  console.log('📦 Request body length:', body.length);
  
  // Get the signature from the headers
  const signature = req.headers.get('stripe-signature') || '';
  console.log('🔑 Stripe signature present:', !!signature);

  // Webhook secret from environment variables
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log('🔐 Webhook secret configured:', !!webhookSecret);
  
  if (!webhookSecret) {
    console.error('❌ Missing Stripe webhook secret');
    return new NextResponse('Webhook secret is missing', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature (async version for Edge Runtime)
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Webhook signature verification failed: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  console.log(`📨 Received Stripe webhook event: ${event.type}`);

  // Handle different event types
  try {
    console.log(`Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'price.updated':
        await handlePriceUpdated(event.data.object as Stripe.Price);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.created':
      case 'customer.updated':
        await handleCustomerChange(event.data.object as Stripe.Customer);
        break;
        
      // Stripe Connect account events
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;
        
      case 'person.updated':
        await handlePersonUpdated(event.data.object as Stripe.Person);
        break;
        
      // Payment Intent events for our uncaptured payment flow
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      // Setup Intent events for saving payment methods
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;
        
      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;
        
      // Session events
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
        
      // Events we don't need to handle (created by our own API calls)
      case 'price.created':
      case 'product.created':
        console.log(`Ignoring ${event.type} - handled synchronously by our app`);
        break;
        
      // Add more event handlers as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing webhook: ${errorMessage}`);
    return new NextResponse(`Webhook processing error: ${errorMessage}`, {
      status: 500,
    });
  }
}

// Handle price.updated event
async function handlePriceUpdated(price: Stripe.Price) {
  console.log(`Price updated: ${price.id}`);
  
  // Make sure we have a unit_amount
  if (!price.unit_amount) {
    console.error(`Price ${price.id} has no unit_amount`);
    return;
  }
  
  // Convert unit_amount from cents to dollars (for database)
  const newPriceInDollars = price.unit_amount / 100;
  
  // Update the price in our database
  const updatedPlan = await updatePlanPriceInDb(price.id, newPriceInDollars);
  
  if (updatedPlan) {
    console.log(`Successfully updated price for plan: ${updatedPlan.name} to $${newPriceInDollars}`);
  } else {
    console.error(`No subscription plan found with stripe_price_id: ${price.id}`);
  }
}

// Handle customer created or updated event
async function handleCustomerChange(customer: Stripe.Customer) {
  // Get the user ID from metadata
  const userId = customer.metadata?.userId;
  
  // Skip if no userId in metadata
  if (!userId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Check if customer already exists in our database
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (findError && findError.code !== 'PGRST116') { // Not 'not found' error
      console.error(`Error checking for existing customer: ${findError.message}`);
      return;
    }
    
    if (existingCustomer) {
      // Update existing customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({ stripe_customer_id: customer.id })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error(`Error updating customer: ${updateError.message}`);
      }
    } else {
      // Create new customer record
      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customer.id
        });
        
      if (insertError) {
        console.error(`Error creating customer record: ${insertError.message}`);
      }
    }
    
    // Update user name in our database if provided by Stripe
    if (customer.name) {
      const nameParts = customer.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (firstName || lastName) {
        const updateData: Record<string, string> = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        
        const { error: userUpdateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
          
        if (userUpdateError) {
          console.error(`Error updating user data: ${userUpdateError.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling customer change:', error);
  }
}

// Helper function to create subscription record
async function createSubscriptionRecord(
  supabase: ReturnType<typeof createAdminClient>, 
  profileId: string, 
  planId: string, 
  subscriptionId: string
) {
  // Get the Stripe subscription
  console.log('Retrieving Stripe subscription...');
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  console.log('Stripe subscription retrieved:', subscription.status);
  
  // Create or update subscription record
  const startDate = new Date();
  const endDate = new Date(((subscription as unknown) as StripeSubscriptionWithPeriod).current_period_end * 1000);
  
  console.log('Subscription dates:', { startDate, endDate });
  
  // Check if subscription record already exists
  console.log('Checking for existing subscription record...');
  const { data: existingSub } = await supabase
    .from('professional_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
    
  console.log('Existing subscription check:', existingSub);
    
  if (existingSub) {
    // Update existing subscription
    console.log('Updating existing subscription record...');
    const { error: subUpdateError } = await supabase
      .from('professional_subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id);
      
    console.log('Subscription update result:', { subUpdateError });
  } else {
    // Create new subscription record
    console.log('Creating new subscription record...');
    const { error: subInsertError } = await supabase
      .from('professional_subscriptions')
      .insert({
        professional_profile_id: profileId,
        subscription_plan_id: planId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        stripe_subscription_id: subscriptionId
      });
      
    console.log('Subscription insert result:', { subInsertError });
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('=== CHECKOUT SESSION COMPLETED ===');
  console.log('Session ID:', session.id);
  console.log('Session mode:', session.mode);
  console.log('Session metadata:', session.metadata);
  
  // Handle subscription checkout sessions
  if (session.mode === 'subscription') {
    console.log('Processing subscription checkout session...');
    await handleSubscriptionCheckout(session);
    return;
  }
  
  // Handle booking payment checkout sessions (payment or setup mode)
  if (session.mode === 'payment' || session.mode === 'setup') {
    console.log('Processing booking payment checkout session...');
    await handleBookingPaymentCheckout(session);
    return;
  }
  
  console.log('Unknown session mode:', session.mode);
}

// Handle subscription checkout (existing logic)
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  
  if (!userId) {
    console.error('Missing user ID in checkout session');
    return;
  }
  
  // Update user's subscription status in the database
  try {
    const supabase = createAdminClient();
    
    // Get subscription and customer information
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;
    const planId = session.metadata?.planId;
    
    console.log('Subscription ID:', subscriptionId);
    console.log('Customer ID:', customerId);
    console.log('Plan ID:', planId);
    
    if (!subscriptionId || !customerId || !planId) {
      console.error('Missing required data in checkout session:', {
        subscriptionId,
        customerId,
        planId,
        metadata: session.metadata
      });
      return;
    }
    
    // Check if the user exists in professional_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    console.log('Professional profile lookup result:', { profileData, profileError });
    
    if (profileError || !profileData) {
      console.log('Professional profile not found, creating one...');
      
      // First, ensure the user has the professional role
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'professional')
        .single();
        
      if (roleData) {
        // Update user role to professional if not already
        await supabase
          .from('users')
          .update({ role_id: roleData.id })
          .eq('id', userId);
      }
      
      // Create professional profile
      const { data: newProfileData, error: createProfileError } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: userId,
          is_subscribed: false
        })
        .select('id')
        .single();
        
      if (createProfileError) {
        console.error(`Error creating professional profile: ${createProfileError.message}`);
        return;
      }
      
      console.log('Created new professional profile:', newProfileData);
      
      // Use the newly created profile
      const profileId = newProfileData.id;
      
      // Update professional profile subscription status
      console.log('Updating professional profile subscription status...');
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({
          is_subscribed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);
      
      console.log('Profile update result:', { updateError });
      
      if (updateError) {
        console.error(`Error updating professional profile: ${updateError.message}`);
        return;
      }
      
      // Continue with subscription creation using the new profile ID
      await createSubscriptionRecord(supabase, profileId, planId, subscriptionId);
    } else {
      // Existing logic for when profile exists
      // Update professional profile subscription status
      console.log('Updating professional profile subscription status...');
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({
          is_subscribed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileData.id);
      
      console.log('Profile update result:', { updateError });
      
      if (updateError) {
        console.error(`Error updating professional profile: ${updateError.message}`);
        return;
      }
      
      // Continue with subscription creation using the existing profile ID
      await createSubscriptionRecord(supabase, profileData.id, planId, subscriptionId);
    }
    
    // Store customer record
    console.log('Saving customer record...');
    await saveOrUpdateCustomer(userId, customerId);
    
    console.log(`Successfully updated subscription status for user: ${userId}`);
    console.log('=== END SUBSCRIPTION CHECKOUT PROCESSING ===');
  } catch (error) {
    console.error('Error updating subscription status:', error);
  }
}

// Handle booking payment checkout (new logic)
async function handleBookingPaymentCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const bookingId = session.metadata?.booking_id;
  
  if (!userId || !bookingId) {
    console.error('Missing user ID or booking ID in checkout session');
    return;
  }
  
  try {
    const supabase = createAdminClient();
    
    // Save customer information if we have it
    if (session.customer && typeof session.customer === 'string') {
      console.log('Saving customer record...');
      await saveOrUpdateCustomer(userId, session.customer);
    }
    
    // Determine payment status
    let paymentStatus = 'pending';
    let paymentIntentId: string | undefined;
    
    console.log('🔍 Session payment_status:', session.payment_status);
    console.log('🔍 Session payment_intent:', session.payment_intent);
    console.log('🔍 Session payment_intent type:', typeof session.payment_intent);
    
    if (session.mode === 'payment') {
      if (session.payment_status === 'paid') {
        paymentStatus = 'completed';
        if (session.payment_intent) {
          paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent.id;
        }
      } else if (session.payment_status === 'unpaid') {
        // Check if this is an uncaptured payment that's actually authorized
        if (session.payment_intent) {
          paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent.id;
          
          console.log('🔍 Payment intent ID:', paymentIntentId);
          
          // For uncaptured payments, we need to fetch the payment intent to check its status
          try {
            console.log('🔍 Fetching payment intent details...');
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            console.log('🔍 Payment intent status:', paymentIntent.status);
            
            // For uncaptured payments, 'requires_capture' means authorized and successful
            if (paymentIntent.status === 'requires_capture') {
              paymentStatus = 'completed'; // Treat as successful
              console.log('✅ Uncaptured payment authorized successfully');
            } else if (paymentIntent.status === 'succeeded') {
              paymentStatus = 'completed';
              console.log('✅ Payment succeeded');
            } else {
              paymentStatus = 'failed';
              console.log('❌ Payment intent failed with status:', paymentIntent.status);
            }
          } catch (error) {
            console.error('❌ Error fetching payment intent:', error);
            paymentStatus = 'failed';
          }
        } else {
          paymentStatus = 'failed';
          console.log('❌ No payment intent found');
        }
      } else if (session.payment_status === 'no_payment_required') {
        // Handle case where no payment is required (e.g., free services)
        paymentStatus = 'completed';
        console.log('✅ No payment required');
      }
    } else if (session.mode === 'setup') {
      // For setup mode, payment method is saved but no payment taken yet
      if (session.setup_intent && typeof session.setup_intent === 'object') {
        if (session.setup_intent.status === 'succeeded') {
          paymentStatus = 'pending'; // Payment method saved, payment will be processed later
        }
      }
    }
    
    console.log('Payment status determined:', paymentStatus);
    
    // Update booking payment status
    const { error: paymentUpdateError } = await supabase
      .from('booking_payments')
      .update({
        status: paymentStatus,
        stripe_payment_intent_id: paymentIntentId || null,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);
    
    if (paymentUpdateError) {
      console.error('Failed to update booking payment status:', paymentUpdateError);
    } else {
      console.log('Successfully updated booking payment status');
    }
    
    // Update booking status to confirmed if payment was successful
    if (paymentStatus === 'completed') {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (bookingUpdateError) {
        console.error('Failed to update booking status:', bookingUpdateError);
      } else {
        console.log('Successfully confirmed booking');
        
        // Send booking confirmation emails
        try {
          console.log('🔍 Looking for appointment ID for booking:', bookingId);
          // Get appointment ID for this booking
          const { data: appointment } = await supabase
            .from('appointments')
            .select('id')
            .eq('booking_id', bookingId)
            .single();
          
          console.log('📋 Appointment found:', appointment);
          
          if (appointment?.id) {
            console.log('📧 Importing email notification function...');
            const { sendBookingConfirmationEmails } = await import('@/server/domains/stripe-payments/email-notifications');
            
            // Check if payment is uncaptured by looking at payment intent status
            const isUncaptured = session.payment_intent && 
              typeof session.payment_intent === 'object' && 
              session.payment_intent.status === 'requires_capture';
            
            console.log('🔍 Payment status - isUncaptured:', isUncaptured);
            console.log('📬 Calling sendBookingConfirmationEmails with:', {
              bookingId,
              appointmentId: appointment.id,
              isUncaptured: isUncaptured || false
            });
            
            const emailResult = await sendBookingConfirmationEmails(bookingId, appointment.id, isUncaptured || false);
            console.log('📨 Email sending result:', emailResult);
            
            if (emailResult.success) {
              console.log('✅ Booking confirmation emails sent successfully');
            } else {
              console.error('❌ Failed to send booking confirmation emails:', emailResult.error);
            }
          } else {
            console.error('❌ No appointment found for booking:', bookingId);
          }
        } catch (emailError) {
          console.error('💥 Exception while sending booking confirmation emails:', emailError);
          // Don't fail the webhook if email sending fails
        }
      }
    }
    
    console.log(`Successfully processed booking payment for booking: ${bookingId}`);
  } catch (error) {
    console.error('Error processing booking payment checkout:', error);
  }
}

// Helper function to save or update customer record
async function saveOrUpdateCustomer(userId: string, customerId: string) {
  try {
    const supabase = createAdminClient();
    
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (existingCustomer) {
      // Update existing customer
      await supabase
        .from('customers')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
    } else {
      // Create new customer
      await supabase
        .from('customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId
        });
    }
  } catch (error) {
    console.error('Error saving customer record:', error);
  }
}

// Handle subscription created or updated event
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log('=== SUBSCRIPTION CHANGE ===');
  console.log('Subscription ID:', subscription.id);
  console.log('Status:', subscription.status);
  console.log('Cancel at period end:', subscription.cancel_at_period_end);
  
  // Get metadata to find the user
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to look up by customer ID
    await updateSubscriptionByCustomerId(
      subscription.customer as string,
      subscription.id,
      subscription.status === 'active',
      subscription.cancel_at_period_end
    );
    return;
  }
  
  // Update the subscription directly with the user ID
  await updateUserSubscription(
    userId,
    subscription.id,
    subscription.status === 'active',
    subscription.cancel_at_period_end
  );
}

// Handle subscription cancelled event
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  // Get metadata to find the user
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to look up by customer ID
    await updateSubscriptionByCustomerId(
      subscription.customer as string,
      subscription.id,
      false,
      subscription.cancel_at_period_end
    );
    return;
  }
  
  // Update the subscription directly with the user ID
  await updateUserSubscription(
    userId,
    subscription.id,
    false,
    subscription.cancel_at_period_end
  );
}

// Helper function to update subscription by customer ID
async function updateSubscriptionByCustomerId(
  customerId: string,
  subscriptionId: string,
  isActive: boolean,
  cancelAtPeriodEnd: boolean | null
) {
  try {
    const supabase = createAdminClient();
    
    // Find the user by customer ID
    const { data, error } = await supabase
      .from('customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (error || !data) {
      console.error(`No user found with customer ID: ${customerId}`);
      return;
    }
    
    // Update the user's subscription
    await updateUserSubscription(data.user_id, subscriptionId, isActive, cancelAtPeriodEnd);
  } catch (error) {
    console.error('Error updating subscription by customer ID:', error);
  }
}

// Helper function to update a user's subscription
async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  isActive: boolean,
  cancelAtPeriodEnd: boolean | null
) {
  try {
    const supabase = createAdminClient();
    
    // Update professional profile subscription status
    const { error: profileError } = await supabase
      .from('professional_profiles')
      .update({
        is_subscribed: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (profileError) {
      console.error(`Error updating profile for user ${userId}: ${profileError.message}`);
    }
    
    // Get professional profile ID
    const { data: profileData } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (!profileData) {
      console.error(`No professional profile found for user: ${userId}`);
      return;
    }
    
    // Get subscription details if active
    if (isActive) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const endDate = new Date(((stripeSubscription as unknown) as StripeSubscriptionWithPeriod).current_period_end * 1000);
        
        // Get price ID to find our plan
        const priceId = stripeSubscription.items.data[0]?.price.id;
        
        if (priceId) {
          // Find subscription plan by stripe_price_id
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('stripe_price_id', priceId)
            .single();
          
          // Update subscription in database
          if (planData) {
            // Check if record exists
            const { data: existingSub } = await supabase
              .from('professional_subscriptions')
              .select('id')
              .eq('stripe_subscription_id', subscriptionId)
              .single();
              
            if (existingSub) {
              // Update existing record
              await supabase
                .from('professional_subscriptions')
                .update({
                  status: 'active',
                  end_date: endDate.toISOString(),
                  cancel_at_period_end: cancelAtPeriodEnd || false,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingSub.id);
            } else {
              // Create new record
              await supabase
                .from('professional_subscriptions')
                .insert({
                  professional_profile_id: profileData.id,
                  subscription_plan_id: planData.id,
                  status: 'active',
                  start_date: new Date().toISOString(),
                  end_date: endDate.toISOString(),
                  stripe_subscription_id: subscriptionId,
                  cancel_at_period_end: cancelAtPeriodEnd || false
                });
            }
          }
        }
      } catch (stripeError) {
        console.error(`Error retrieving subscription from Stripe: ${stripeError}`);
      }
    } else {
      // Update subscription status to cancelled
      const { error: subError } = await supabase
        .from('professional_subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: false, // Reset when actually cancelled
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);
        
      if (subError) {
        console.error(`Error updating subscription: ${subError.message}`);
      }
    }
    
    console.log(`Successfully ${isActive ? 'activated' : 'deactivated'} subscription for user: ${userId}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

// Handle Stripe Connect account updates
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Account updated: ${account.id}`);
  
  // Get the user ID from metadata
  const userId = account.metadata?.userId;
  
  // Skip if no userId in metadata
  if (!userId) {
    console.log(`No userId in metadata for account: ${account.id}`);
    return;
  }
  
  try {
    // Determine simple status based on account capabilities
    let connectStatus: 'not_connected' | 'pending' | 'complete' = 'pending';
    const wasComplete = account.charges_enabled && account.payouts_enabled;
    
    if (wasComplete) {
      connectStatus = 'complete';
    } else if (!account.details_submitted) {
      connectStatus = 'not_connected';
    }
    
    // Update our database with the latest account status
    const updateResult = await updateStripeConnectStatus(userId, {
      accountId: account.id,
      connectStatus
    });
    
    if (updateResult.success) {
      console.log(`Successfully updated Stripe Connect status for user: ${userId} to ${connectStatus}`);
      
      // If the account just became complete, trigger service synchronization
      if (connectStatus === 'complete') {
        console.log(`Triggering service sync for newly connected account: ${userId}`);
        
        // Import the sync action dynamically to avoid circular dependencies
        const { onSubscriptionChangeAction } = await import('@/server/domains/stripe-services');
        
        try {
          const syncResult = await onSubscriptionChangeAction(userId);
          if (syncResult.success) {
            console.log(`Successfully synced ${syncResult.syncResult?.successCount || 0} services after Stripe Connect completion`);
          } else {
            console.error('Service sync failed after Stripe Connect completion:', syncResult.message);
          }
        } catch (syncError) {
          console.error('Error triggering service sync after Stripe Connect completion:', syncError);
        }
      }
    } else {
      console.error('Failed to update Stripe Connect status:', updateResult.error);
    }
  } catch (error) {
    console.error('Error updating Stripe Connect status:', error);
  }
}

// Handle Stripe Connect capability updates
async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log(`Capability updated: ${capability.id} for account: ${capability.account}`);
  
  try {
    // Get the account to find the user ID
    const account = await stripe.accounts.retrieve(capability.account as string);
    const userId = account.metadata?.userId;
    
    if (!userId) {
      console.log(`No userId in metadata for account: ${capability.account}`);
      return;
    }
    
    // Determine if this capability change affects the overall account status
    // We mainly care about card_payments and transfers capabilities
    if (capability.id === 'card_payments' || capability.id === 'transfers') {
      console.log(`Important capability ${capability.id} updated to status: ${capability.status}`);
      
      // Refresh the account status to get the latest capability information
      let connectStatus: 'not_connected' | 'pending' | 'complete' = 'pending';
      
      if (account.charges_enabled && account.payouts_enabled) {
        connectStatus = 'complete';
      } else if (!account.details_submitted) {
        connectStatus = 'not_connected';
      }
      
      // Update our database
      const updateResult = await updateStripeConnectStatus(userId, {
        accountId: account.id,
        connectStatus
      });
      
      if (updateResult.success) {
        console.log(`Updated Stripe Connect status after capability change: ${userId} to ${connectStatus}`);
        
        // If the account just became complete due to capability approval, trigger service sync
        if (connectStatus === 'complete') {
          console.log(`Triggering service sync after capability completion: ${userId}`);
          
          try {
            const { onSubscriptionChangeAction } = await import('@/server/domains/stripe-services');
            const syncResult = await onSubscriptionChangeAction(userId);
            
            if (syncResult.success) {
              console.log(`Successfully synced ${syncResult.syncResult?.successCount || 0} services after capability completion`);
            } else {
              console.error('Service sync failed after capability completion:', syncResult.message);
            }
          } catch (syncError) {
            console.error('Error triggering service sync after capability completion:', syncError);
          }
        }
      } else {
        console.error('Failed to update Stripe Connect status after capability change:', updateResult.error);
      }
    } else {
      console.log(`Capability ${capability.id} updated but not critical for our app`);
    }
  } catch (error) {
    console.error('Error handling capability update:', error);
  }
}

// Handle Stripe Connect person updates
async function handlePersonUpdated(person: Stripe.Person) {
  console.log(`Person updated: ${person.id} for account: ${person.account}`);
  
  try {
    // Get the account to find the user ID
    const account = await stripe.accounts.retrieve(person.account as string);
    const userId = account.metadata?.userId;
    
    if (!userId) {
      console.log(`No userId in metadata for account: ${person.account}`);
      return;
    }
    
    // Log person verification status for debugging
    console.log(`Person verification status: ${JSON.stringify(person.verification)}`);
    
    // We could potentially update our database with person verification status
    // For now, we'll just log it as it's mainly informational
    // The main account status is handled by account.updated events
    
    console.log(`Person update processed for user: ${userId}`);
  } catch (error) {
    console.error('Error handling person update:', error);
  }
}

// Handle payment intent requiring action (3D Secure)
async function handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent ${paymentIntent.id} requires action`);
  
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Update payment status to indicate authentication required
    await supabase
      .from('booking_payments')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('stripe_payment_intent_id', paymentIntent.id);
      
    console.log(`Updated payment status for booking ${bookingId} - requires action`);
  } catch (error) {
    console.error(`Error updating payment for requires action: ${bookingId}`, error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent ${paymentIntent.id} failed`);
  
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Delete the pending_payment booking since payment failed
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending_payment');
      
    if (deleteError) {
      console.error(`Failed to delete failed booking ${bookingId}:`, deleteError);
      
      // Fallback: update payment status to failed
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .eq('stripe_payment_intent_id', paymentIntent.id);
    } else {
      console.log(`Successfully deleted failed booking ${bookingId} and freed up the time slot`);
    }
    
    // TODO: Send failure notification to client
  } catch (error) {
    console.error(`Error handling failed payment intent: ${bookingId}`, error);
  }
}

// Handle canceled payment intent
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent ${paymentIntent.id} canceled`);
  
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Delete the pending_payment booking since payment was cancelled
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending_payment');
      
    if (deleteError) {
      console.error(`Failed to delete cancelled booking ${bookingId}:`, deleteError);
      
      // Fallback: update booking status to cancelled and payment to failed  
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .eq('stripe_payment_intent_id', paymentIntent.id);
        
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
    } else {
      console.log(`Successfully deleted cancelled booking ${bookingId} and freed up the time slot`);
    }
  } catch (error) {
    console.error(`Error handling cancelled payment intent: ${bookingId}`, error);
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent ${paymentIntent.id} succeeded`);
  
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Update payment status to completed
    await supabase
      .from('booking_payments')
      .update({
        status: 'completed',
        captured_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('stripe_payment_intent_id', paymentIntent.id);
      
    console.log(`Updated payment status for booking ${bookingId} - completed`);
  } catch (error) {
    console.error(`Error updating payment for success: ${bookingId}`, error);
  }
}

// Handle successful setup intent (saved payment method)
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  console.log(`Setup intent ${setupIntent.id} succeeded`);
  
  const bookingId = setupIntent.metadata?.booking_id;
  const customerId = setupIntent.customer as string;
  const paymentMethodId = setupIntent.payment_method as string;
  
  if (!customerId || !bookingId || !paymentMethodId) {
    console.error('Missing required data from setup intent:', { customerId, bookingId, paymentMethodId });
    return;
  }
  
  try {
    const supabase = createAdminClient();
    
    // Get user ID from customer
    const { data: customer } = await supabase
      .from('customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
      
    if (customer) {
      console.log(`Setup intent succeeded for user ${customer.user_id}, booking ${bookingId} - payment method ${paymentMethodId} saved`);
      
      // Update booking status to confirmed since payment method is now saved
      await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      // Update payment status to pending and save the payment method ID for cron job
      await supabase
        .from('booking_payments')
        .update({
          status: 'pending',
          stripe_payment_method_id: paymentMethodId, // Save payment method ID for cron job
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      // Send booking confirmation emails
      try {
        // Get appointment ID for the booking
        const { data: appointment } = await supabase
          .from('appointments')
          .select('id')
          .eq('booking_id', bookingId)
          .single();

        if (appointment) {
          const { sendBookingConfirmationEmails } = await import('@/server/domains/stripe-payments/email-notifications');
          await sendBookingConfirmationEmails(bookingId, appointment.id, false); // false = not uncaptured, this is setup intent
          console.log(`✅ Booking confirmation emails sent for booking ${bookingId}`);
        } else {
          console.error(`❌ No appointment found for booking ${bookingId}`);
        }
      } catch (emailError) {
        console.error(`❌ Failed to send booking confirmation emails for ${bookingId}:`, emailError);
        // Don't fail the webhook for email errors
      }
    }
  } catch (error) {
    console.error(`Error processing setup intent success:`, error);
  }
}

// Handle failed setup intent
async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  console.log(`Setup intent ${setupIntent.id} failed`);
  
  const bookingId = setupIntent.metadata?.booking_id;
  if (!bookingId) return;
  
  void bookingId; // Suppress unused variable warning
  
  try {
    const supabase = createAdminClient();
    
    // Log the failure - don't fail the booking for setup intent failures
    console.log(`Setup intent failed for booking ${bookingId} - payment method not saved`);
    void supabase; // Suppress unused variable warning
  } catch (error) {
    console.error(`Error processing setup intent failure:`, error);
  }
}

// Handle expired checkout session
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log(`Checkout session ${session.id} expired`);
  
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;
  
  try {
    const supabase = createAdminClient();
    
    // Delete the pending_payment booking since checkout expired
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending_payment');
      
    if (deleteError) {
      console.error(`Failed to delete expired booking ${bookingId}:`, deleteError);
      
      // Fallback: update payment status to failed
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .eq('stripe_checkout_session_id', session.id);
    } else {
      console.log(`Successfully deleted expired booking ${bookingId} and freed up the time slot`);
    }
  } catch (error) {
    console.error(`Error handling expired checkout session: ${bookingId}`, error);
  }
} 