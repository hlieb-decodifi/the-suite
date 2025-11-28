import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  updatePlanPriceInDb,
  updateStripeConnectStatus,
} from '@/server/domains/subscriptions/db';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { revalidatePath } from 'next/cache';
import { trackActivity } from '@/api/activity-log/actions';

// Configure this API route to use Node.js Runtime for email functionality
export const runtime = 'nodejs';

// Simple GET endpoint for testing
export async function GET() {
  return new NextResponse(
    JSON.stringify({
      status: 'Webhook endpoint is working',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// Extended interface for Stripe Subscription with period fields
type StripeSubscriptionWithPeriod = {
  current_period_start: number;
  current_period_end: number;
} & Stripe.Subscription;

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
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Centralized helper function to send booking confirmation emails
async function sendConfirmationEmailsForBooking(
  bookingId: string,
  context: string = 'payment processed',
): Promise<void> {
  try {
    console.log(
      `📧 ${context} - attempting to send confirmation emails for booking ${bookingId}`,
    );

    const supabase = createAdminClient();
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (appointment) {
      const { sendBookingConfirmationEmails } = await import(
        '@/server/domains/stripe-payments/email-notifications'
      );
      const result = await sendBookingConfirmationEmails(
        bookingId,
        appointment.id,
      );

      if (result.success) {
        console.log(
          `✅ Booking confirmation emails processed for booking ${bookingId} (${context})`,
        );
      } else {
        console.log(
          `⏭️ Booking confirmation emails skipped for booking ${bookingId}: ${result.error || 'Unknown reason'}`,
        );
      }
    } else {
      console.log(`❌ No appointment found for booking ${bookingId}`);
    }
  } catch (emailError) {
    console.error(
      `❌ Failed to send booking confirmation emails for ${bookingId}:`,
      emailError,
    );
    // Don't fail the webhook for email errors
  }
}

// Webhook endpoint for Stripe events
export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');

  console.log(`[Webhook] 📥 Received Stripe webhook`);

  if (!sig) {
    console.error('[Webhook] ❌ No Stripe signature found');
    return new Response('No Stripe signature', { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Webhook] ❌ Missing STRIPE_WEBHOOK_SECRET');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log(
      `[Webhook] ✅ Verified Stripe signature for event: ${event.type}`,
    );
  } catch (err) {
    console.error(
      '[Webhook] ❌ Invalid Stripe signature:',
      err instanceof Error ? err.message : err,
    );
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`[Webhook] 🔄 Processing event type: ${event.type}`);

  try {
    switch (event.type) {
      case 'price.updated':
        await handlePriceUpdated(event.data.object as Stripe.Price);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(
          event.data.object as Stripe.Subscription,
        );
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
        await handlePaymentIntentRequiresAction(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      // Handle manual payment captures from Stripe dashboard
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case 'charge.captured':
        await handleChargeCaptured(event.data.object as Stripe.Charge);
        break;

      // Handle refunds created through Stripe dashboard
      case 'charge.dispute.created':
      case 'charge.refunded':
        console.log(`[Webhook] 💰 Handling charge refund event`);
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      // Handle refund events from our refund system
      case 'refund.created':
      case 'refund.failed':
      case 'refund.updated':
        console.log(`[Webhook] 💰 Handling refund event: ${event.type}`);
        await handleRefundEvent(event.data.object as Stripe.Refund);
        break;

      // Setup Intent events for saving payment methods
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(
          event.data.object as Stripe.SetupIntent,
        );
        break;

      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;

      // Session events
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      // Events we don't need to handle (created by our own API calls)
      case 'price.created':
      case 'product.created':
        console.log(
          `Ignoring ${event.type} - handled synchronously by our app`,
        );
        break;

      case 'payment_intent.amount_capturable_updated':
        await handlePaymentIntentCapturableUpdated(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      default:
        console.log(`[Webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log(
      `[Webhook] ✅ Successfully processed webhook event: ${event.type}`,
    );
    return new Response('Processed', { status: 200 });
  } catch (error) {
    console.error(`[Webhook] ❌ Error processing webhook:`, {
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response('Error processing webhook', { status: 500 });
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
    console.log(
      `Successfully updated price for plan: ${updatedPlan.name} to $${newPriceInDollars}`,
    );
  } else {
    console.error(
      `No subscription plan found with stripe_price_id: ${price.id}`,
    );
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

    if (findError && findError.code !== 'PGRST116') {
      // Not 'not found' error
      console.error(
        `Error checking for existing customer: ${findError.message}`,
      );
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
      const { error: insertError } = await supabase.from('customers').insert({
        user_id: userId,
        stripe_customer_id: customer.id,
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
  subscriptionId: string,
) {
  // Get the Stripe subscription
  console.log('Retrieving Stripe subscription...');
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  console.log('Stripe subscription retrieved:', subscription.status);

  // Create or update subscription record
  const startDate = new Date();
  const endDate = new Date(
    (subscription as unknown as StripeSubscriptionWithPeriod)
      .current_period_end * 1000,
  );

  console.log('Subscription dates:', { startDate, endDate });

  // Validate that the planId exists in our database
  const { data: planData, error: planError } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .eq('id', planId)
    .single();

  if (planError || !planData) {
    console.error('Invalid plan ID:', planId, 'Error:', planError);
    throw new Error(`Invalid subscription plan ID: ${planId}`);
  }

  console.log('Valid subscription plan found:', planData);

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
        updated_at: new Date().toISOString(),
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
        stripe_subscription_id: subscriptionId,
      });

    console.log('Subscription insert result:', { subInsertError });
    if (subInsertError) {
      console.error(
        'Failed to create subscription record:',
        subInsertError.message,
        subInsertError.details,
      );
      throw new Error(
        `Subscription creation failed: ${subInsertError.message}`,
      );
    }
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
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
    console.log('Plan ID from metadata:', planId);
    console.log('All session metadata:', session.metadata);

    if (!subscriptionId || !customerId || !planId) {
      console.error('Missing required data in checkout session:', {
        subscriptionId,
        customerId,
        planId,
        metadata: session.metadata,
      });
      return;
    }

    // Check if the user exists in professional_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('Professional profile lookup result:', {
      profileData,
      profileError,
    });

    if (profileError || !profileData) {
      console.log('Professional profile not found, creating one...');

      // First, ensure the user has the professional role
      await supabase.from('user_roles').upsert(
        {
          user_id: userId,
          role: 'professional',
        },
        {
          onConflict: 'user_id',
        },
      );

      // Create professional profile
      const { data: newProfileData, error: createProfileError } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: userId,
        })
        .select('id')
        .single();

      if (createProfileError) {
        console.error(
          `Error creating professional profile: ${createProfileError.message}`,
        );
        return;
      }

      console.log('Created new professional profile:', newProfileData);

      // Use the newly created profile
      const profileId = newProfileData.id;

      // Subscription status now tracked dynamically via professional_subscriptions table
      console.log(
        'Subscription status now tracked dynamically via professional_subscriptions table',
      );

      // Continue with subscription creation using the new profile ID
      await createSubscriptionRecord(
        supabase,
        profileId,
        planId,
        subscriptionId,
      );
    } else {
      // Existing logic for when profile exists
      // Subscription status now tracked dynamically via professional_subscriptions table
      console.log(
        'Subscription status now tracked dynamically via professional_subscriptions table',
      );

      // Continue with subscription creation using the existing profile ID
      await createSubscriptionRecord(
        supabase,
        profileData.id,
        planId,
        subscriptionId,
      );
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

// Handle tip payment checkout
async function handleTipPaymentCheckout(session: Stripe.Checkout.Session) {
  console.log('=== TIP PAYMENT CHECKOUT ===');
  console.log('Session ID:', session.id);
  console.log('Payment status:', session.payment_status);
  console.log('Session metadata:', session.metadata);

  const supabase = createAdminClient();
  const tipId = session.metadata?.tip_id;
  const bookingId = session.metadata?.booking_id;

  if (!tipId) {
    console.error('❌ No tip ID found in session metadata');
    return;
  }

  try {
    if (session.payment_status === 'paid') {
      console.log('✅ Tip payment successful, updating tip status');

      // Update tip status to completed
      const { error: updateError } = await supabase
        .from('tips')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tipId);

      if (updateError) {
        console.error('❌ Error updating tip status:', updateError);
        return;
      }

      console.log('✅ Tip payment processed successfully:', tipId);

      // Optional: Log activity for analytics
      if (bookingId) {
        await trackActivity({
          activityType: 'booking_completed', // Use existing enum value
          entityType: 'booking',
          entityId: bookingId,
          metadata: {
            tip_id: tipId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            payment_type: 'tip',
          },
        });
      }
    } else {
      console.log(
        '❌ Tip payment not successful, status:',
        session.payment_status,
      );

      // Update tip status to failed
      const { error: updateError } = await supabase
        .from('tips')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tipId);

      if (updateError) {
        console.error('❌ Error updating tip status to failed:', updateError);
      }
    }
  } catch (error) {
    console.error('❌ Error processing tip payment:', error);
  }
}

// Handle booking payment checkout
async function handleBookingPaymentCheckout(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient();
  const bookingId = session.metadata?.booking_id;
  const paymentType = session.metadata?.payment_type;

  if (!bookingId) {
    console.error('❌ No booking ID found in session metadata');
    return;
  }

  // Handle tip payments
  if (paymentType === 'tip') {
    console.log('🎯 Processing tip payment checkout session');
    await handleTipPaymentCheckout(session);
    return;
  }

  // Check payment flow type
  const paymentFlow = session.metadata?.payment_flow;

  // Handle split payment flow
  if (
    paymentFlow === 'split_service_fee_and_amount' &&
    session.payment_intent &&
    typeof session.payment_intent === 'object'
  ) {
    // For split payments, the payment intent should be uncaptured (requires_capture status)
    const paymentIntent = session.payment_intent;
    if (paymentIntent.status === 'requires_capture') {
      console.log(
        '🔍 Processing split payment - partially capturing service fee, leaving service amount uncaptured',
      );
      await handleSplitPaymentPartialCapture(session, bookingId);
    } else {
      console.log(
        '⚠️ Split payment intent has unexpected status:',
        paymentIntent.status,
      );
    }
  }

  // Handle immediate service fee only flow (cash payments)
  if (paymentFlow === 'immediate_service_fee_only') {
    console.log(
      '🔍 Processing immediate service fee only payment for cash booking',
    );

    try {
      // Get appointment timing
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('booking_id', bookingId)
        .single();

      if (appointmentError || !appointmentData) {
        console.error('❌ Error fetching appointment data:', appointmentError);
        return;
      }

      // Calculate payment schedule
      const { data: scheduleData, error: scheduleError } = await supabase.rpc(
        'calculate_payment_schedule',
        {
          appointment_start_time: appointmentData.start_time,
          appointment_end_time: appointmentData.end_time,
        },
      );

      if (
        scheduleError ||
        !scheduleData ||
        !Array.isArray(scheduleData) ||
        scheduleData.length === 0
      ) {
        console.error('❌ Error calculating payment schedule:', scheduleError);
        return;
      }

      const captureDate = scheduleData[0]?.capture_date;
      if (!captureDate) {
        console.error('❌ No capture date returned in schedule data');
        return;
      }

      console.log('📅 Payment schedule calculated:', scheduleData);

      // Update booking payment with schedule
      const { error: updateError } = await supabase
        .from('booking_payments')
        .update({
          capture_scheduled_for: captureDate,
          pre_auth_placed_at: new Date().toISOString(),
          authorization_expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days from now
          status: 'authorized',
        })
        .eq('booking_id', bookingId);

      if (updateError) {
        console.error(
          '❌ Error updating booking payment schedule:',
          updateError,
        );
        return;
      }

      console.log('✅ Updated booking payment with schedule:', {
        bookingId,
        captureScheduledFor: captureDate,
      });

      // Send confirmation emails for cash payments
      await sendConfirmationEmailsForBooking(
        bookingId,
        'cash payment processed',
      );
    } catch (error) {
      console.error(
        '❌ Error processing immediate service fee only payment:',
        error,
      );
    }
    return;
  }

  // Handle regular payment mode checkout sessions (full payment, deposit-only, etc.)
  if (session.mode === 'payment' && session.payment_intent) {
    console.log('🔍 Processing regular payment mode checkout session');

    try {
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id;
      const paymentType = session.metadata?.payment_type || 'unknown';

      console.log(
        `💳 Payment intent created: ${paymentIntentId}, Type: ${paymentType}`,
      );

      // Retrieve the payment intent to get the payment method ID
      let paymentMethodId: string | undefined;
      try {
        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);
        if (
          paymentIntent.payment_method &&
          typeof paymentIntent.payment_method === 'string'
        ) {
          paymentMethodId = paymentIntent.payment_method;
          console.log(`💳 Found payment method ID: ${paymentMethodId}`);
        } else if (
          paymentIntent.payment_method &&
          typeof paymentIntent.payment_method === 'object'
        ) {
          paymentMethodId = paymentIntent.payment_method.id;
          console.log(
            `💳 Found payment method ID from object: ${paymentMethodId}`,
          );
        }
      } catch (piError) {
        console.error(
          '❌ Error retrieving payment intent for payment method:',
          piError,
        );
      }

      // Update booking payment with payment intent ID and payment method ID
      const updateData: Record<string, string> = {
        updated_at: new Date().toISOString(),
      };

      // Always save the payment method ID if we have it
      if (paymentMethodId) {
        updateData.stripe_payment_method_id = paymentMethodId;
        console.log(`📝 Saving payment method ID: ${paymentMethodId}`);
      }

      // For deposit payments, store in deposit_payment_intent_id
      if (paymentType === 'deposit' || paymentType === 'deposit_only') {
        updateData.deposit_payment_intent_id = paymentIntentId;
        updateData.status = 'deposit_paid';
        console.log(`📝 Storing as deposit payment intent: ${paymentIntentId}`);
      } else {
        // For full payments, store in stripe_payment_intent_id
        updateData.stripe_payment_intent_id = paymentIntentId;
        updateData.status = 'completed';
        console.log(`📝 Storing as main payment intent: ${paymentIntentId}`);
      }

      const { error: updateError } = await supabase
        .from('booking_payments')
        .update(updateData)
        .eq('booking_id', bookingId);

      if (updateError) {
        console.error(
          '❌ Error updating booking payment with payment intent ID:',
          updateError,
        );
        return;
      }

      console.log('✅ Updated booking payment with payment intent ID:', {
        bookingId,
        paymentIntentId,
        paymentType,
      });

      // Send confirmation emails for all new bookings that have been successfully processed
      // This ensures consistent email behavior regardless of payment method
      const isNewBooking = session.metadata?.is_new_booking !== 'false';

      if (isNewBooking) {
        await sendConfirmationEmailsForBooking(
          bookingId,
          `${paymentType} payment processed (${session.metadata?.payment_flow || 'unknown flow'})`,
        );
      } else {
        console.log(
          `⏭️ Skipping emails for booking ${bookingId} - not a new booking`,
        );
      }
    } catch (error) {
      console.error('❌ Error processing regular payment checkout:', error);
    }
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
      await supabase.from('customers').insert({
        user_id: userId,
        stripe_customer_id: customerId,
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
      subscription.cancel_at_period_end,
    );
    return;
  }

  // Update the subscription directly with the user ID
  await updateUserSubscription(
    userId,
    subscription.id,
    subscription.status === 'active',
    subscription.cancel_at_period_end,
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
      subscription.cancel_at_period_end,
    );
    return;
  }

  // Update the subscription directly with the user ID
  await updateUserSubscription(
    userId,
    subscription.id,
    false,
    subscription.cancel_at_period_end,
  );
}

// Helper function to update subscription by customer ID
async function updateSubscriptionByCustomerId(
  customerId: string,
  subscriptionId: string,
  isActive: boolean,
  cancelAtPeriodEnd: boolean | null,
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
    await updateUserSubscription(
      data.user_id,
      subscriptionId,
      isActive,
      cancelAtPeriodEnd,
    );
  } catch (error) {
    console.error('Error updating subscription by customer ID:', error);
  }
}

// Helper function to update a user's subscription
async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  isActive: boolean,
  cancelAtPeriodEnd: boolean | null,
) {
  try {
    const supabase = createAdminClient();

    // Subscription status now tracked dynamically via professional_subscriptions table
    console.log(
      `Subscription status for user ${userId} now tracked dynamically via professional_subscriptions table`,
    );

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
        const stripeSubscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const endDate = new Date(
          (stripeSubscription as unknown as StripeSubscriptionWithPeriod)
            .current_period_end * 1000,
        );

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
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingSub.id);
            } else {
              // Create new record
              await supabase.from('professional_subscriptions').insert({
                professional_profile_id: profileData.id,
                subscription_plan_id: planData.id,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: endDate.toISOString(),
                stripe_subscription_id: subscriptionId,
                cancel_at_period_end: cancelAtPeriodEnd || false,
              });
            }
          }
        }
      } catch (stripeError) {
        console.error(
          `Error retrieving subscription from Stripe: ${stripeError}`,
        );
      }
    } else {
      // Update subscription status to cancelled
      const { error: subError } = await supabase
        .from('professional_subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: false, // Reset when actually cancelled
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (subError) {
        console.error(`Error updating subscription: ${subError.message}`);
      }
    }

    console.log(
      `Successfully ${isActive ? 'activated' : 'deactivated'} subscription for user: ${userId}`,
    );
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

import { determineConnectStatus } from '@/server/domains/stripe-services/utils';

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
    // Determine status using helper function
    const connectStatus = determineConnectStatus(account);

    // Update our database with the latest account status
    const updateResult = await updateStripeConnectStatus(userId, {
      accountId: account.id,
      connectStatus,
    });

    if (updateResult.success) {
      console.log(
        `Successfully updated Stripe Connect status for user: ${userId} to ${connectStatus}`,
      );

      // If the account just became complete, trigger service synchronization
      if (connectStatus === 'complete') {
        console.log(
          `Triggering service sync for newly connected account: ${userId}`,
        );

        // Import the sync action dynamically to avoid circular dependencies
        const { onSubscriptionChangeAction } = await import(
          '@/server/domains/stripe-services'
        );

        try {
          const syncResult = await onSubscriptionChangeAction(userId);
          if (syncResult.success) {
            console.log(
              `Successfully synced ${syncResult.syncResult?.successCount || 0} services after Stripe Connect completion`,
            );
          } else {
            console.error(
              'Service sync failed after Stripe Connect completion:',
              syncResult.message,
            );
          }
        } catch (syncError) {
          console.error(
            'Error triggering service sync after Stripe Connect completion:',
            syncError,
          );
        }
      }
    } else {
      console.error(
        'Failed to update Stripe Connect status:',
        updateResult.error,
      );
    }
  } catch (error) {
    console.error('Error updating Stripe Connect status:', error);
  }
}

// Handle Stripe Connect capability updates
async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log(
    `Capability updated: ${capability.id} for account: ${capability.account}`,
  );

  try {
    // Get the account to find the user ID
    const account = await stripe.accounts.retrieve(
      capability.account as string,
    );
    const userId = account.metadata?.userId;

    if (!userId) {
      console.log(`No userId in metadata for account: ${capability.account}`);
      return;
    }

    // Determine if this capability change affects the overall account status
    // We mainly care about card_payments and transfers capabilities
    if (capability.id === 'card_payments' || capability.id === 'transfers') {
      console.log(
        `Important capability ${capability.id} updated to status: ${capability.status}`,
      );

      // Refresh the account status to get the latest capability information
      const connectStatus = determineConnectStatus(account);

      // Update our database
      const updateResult = await updateStripeConnectStatus(userId, {
        accountId: account.id,
        connectStatus,
      });

      if (updateResult.success) {
        console.log(
          `Updated Stripe Connect status after capability change: ${userId} to ${connectStatus}`,
        );

        // If the account just became complete due to capability approval, trigger service sync
        if (connectStatus === 'complete') {
          console.log(
            `Triggering service sync after capability completion: ${userId}`,
          );

          try {
            const { onSubscriptionChangeAction } = await import(
              '@/server/domains/stripe-services'
            );
            const syncResult = await onSubscriptionChangeAction(userId);

            if (syncResult.success) {
              console.log(
                `Successfully synced ${syncResult.syncResult?.successCount || 0} services after capability completion`,
              );
            } else {
              console.error(
                'Service sync failed after capability completion:',
                syncResult.message,
              );
            }
          } catch (syncError) {
            console.error(
              'Error triggering service sync after capability completion:',
              syncError,
            );
          }
        }
      } else {
        console.error(
          'Failed to update Stripe Connect status after capability change:',
          updateResult.error,
        );
      }
    } else {
      console.log(
        `Capability ${capability.id} updated but not critical for our app`,
      );
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
    console.log(
      `Person verification status: ${JSON.stringify(person.verification)}`,
    );

    // We could potentially update our database with person verification status
    // For now, we'll just log it as it's mainly informational
    // The main account status is handled by account.updated events

    console.log(`Person update processed for user: ${userId}`);
  } catch (error) {
    console.error('Error handling person update:', error);
  }
}

// Handle payment intent requiring action (3D Secure)
async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
) {
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
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('stripe_payment_intent_id', paymentIntent.id);

    console.log(
      `Updated payment status for booking ${bookingId} - requires action`,
    );
  } catch (error) {
    console.error(
      `Error updating payment for requires action: ${bookingId}`,
      error,
    );
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
      console.error(
        `Failed to delete failed booking ${bookingId}:`,
        deleteError,
      );

      // Fallback: update payment status to failed
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('stripe_payment_intent_id', paymentIntent.id);
    } else {
      console.log(
        `Successfully deleted failed booking ${bookingId} and freed up the time slot`,
      );
    }

    // TODO: Send failure notification to client
  } catch (error) {
    console.error(`Error handling failed payment intent: ${bookingId}`, error);
  }
}

// Handle canceled payment intent
async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
) {
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
      console.error(
        `Failed to delete cancelled booking ${bookingId}:`,
        deleteError,
      );

      // Fallback: update booking status to cancelled and payment to failed
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('stripe_payment_intent_id', paymentIntent.id);

      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    } else {
      console.log(
        `Successfully deleted cancelled booking ${bookingId} and freed up the time slot`,
      );
    }
  } catch (error) {
    console.error(
      `Error handling cancelled payment intent: ${bookingId}`,
      error,
    );
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  console.log(`Payment intent ${paymentIntent.id} succeeded`);

  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) {
    console.log(
      `No booking_id in payment intent metadata, checking database for payment intent ${paymentIntent.id}`,
    );
    return await handlePaymentCaptureByPaymentIntentId(paymentIntent.id);
  }

  try {
    const supabase = createAdminClient();

    // Update payment status to completed
    await supabase
      .from('booking_payments')
      .update({
        status: 'completed',
        captured_at: new Date().toISOString(),
        capture_scheduled_for: null, // Clear the scheduled capture date
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('stripe_payment_intent_id', paymentIntent.id);

    console.log(`Updated payment status for booking ${bookingId} - completed`);
  } catch (error) {
    console.error(`Error updating payment for success: ${bookingId}`, error);
  }
}

// Handle charge succeeded (for manual captures via Stripe dashboard)
async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(`Charge ${charge.id} succeeded`);

  // If charge is associated with a payment intent, use the payment intent ID
  if (charge.payment_intent) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent.id;

    console.log(
      `Charge ${charge.id} is associated with payment intent ${paymentIntentId}`,
    );
    return await handlePaymentCaptureByPaymentIntentId(paymentIntentId);
  }

  console.log(`Charge ${charge.id} has no associated payment intent, skipping`);
}

// Handle charge captured (for cancellation fee charges)
async function handleChargeCaptured(charge: Stripe.Charge) {
  console.log(`Charge ${charge.id} captured`);

  // Check if this is a cancellation fee charge
  if (charge.metadata?.payment_type === 'cancellation_fee') {
    const bookingId = charge.metadata?.booking_id;
    console.log(
      `✅ Cancellation fee charge captured for booking ${bookingId}: $${charge.amount / 100}`,
    );

    // We don't need to update booking payment status here since the cancellation
    // logic already handles the database updates. This is just for logging purposes.
    return;
  }

  // For other charges, use the existing payment intent handler
  if (charge.payment_intent) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent.id;

    console.log(
      `Charge ${charge.id} captured - associated with payment intent ${paymentIntentId}`,
    );
    return await handlePaymentCaptureByPaymentIntentId(paymentIntentId);
  }

  console.log(`Charge ${charge.id} has no associated payment intent, skipping`);
}

// Helper function to handle payment captures by payment intent ID (for manual captures)
async function handlePaymentCaptureByPaymentIntentId(paymentIntentId: string) {
  try {
    const supabase = createAdminClient();

    // Find the booking payment by stripe payment intent ID
    const { data: payment, error: findError } = await supabase
      .from('booking_payments')
      .select('id, booking_id, status, captured_at')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (findError || !payment) {
      console.log(
        `No booking payment found for payment intent ${paymentIntentId}`,
      );
      return;
    }

    // Only update if payment hasn't been captured already
    if (payment.status === 'completed' && payment.captured_at) {
      console.log(
        `Payment for booking ${payment.booking_id} already captured, skipping`,
      );
      return;
    }

    // Update payment status to completed
    const { error: updateError } = await supabase
      .from('booking_payments')
      .update({
        status: 'completed',
        captured_at: new Date().toISOString(),
        capture_scheduled_for: null, // Clear the scheduled capture date
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error(
        `Error updating payment status for ${payment.booking_id}:`,
        updateError,
      );
      return;
    }

    console.log(
      `✅ Successfully updated payment status for booking ${payment.booking_id} - manually captured via Stripe dashboard`,
    );

    // Payment confirmation emails have been removed
    console.log(
      `ℹ️ Payment confirmation emails are no longer sent for booking: ${payment.booking_id}`,
    );
  } catch (error) {
    console.error(
      `Error handling manual capture for payment intent ${paymentIntentId}:`,
      error,
    );
  }
}

// Handle charge refunded (manual refunds via Stripe dashboard)
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Webhook] 💰 Charge ${charge.id} refunded`);
  console.log(`[Webhook] Refund details:`, {
    chargeId: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    refundReason: charge.refunds?.data[0]?.reason,
    refundStatus: charge.refunds?.data[0]?.status,
    metadata: charge.metadata,
  });

  // If charge is associated with a payment intent, use the payment intent ID
  if (charge.payment_intent) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent.id;

    console.log(
      `[Webhook] Charge ${charge.id} refunded - associated with payment intent ${paymentIntentId}`,
    );

    try {
      const supabase = createAdminClient();

      // Find the booking payment by stripe payment intent ID
      const { data: payment, error: findError } = await supabase
        .from('booking_payments')
        .select('id, booking_id, status, amount, deposit_amount, service_fee')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (findError || !payment) {
        console.log(
          `[Webhook] ❌ No booking payment found for refunded payment intent ${paymentIntentId}`,
        );
        return;
      }

      console.log(`[Webhook] Found booking payment:`, {
        bookingId: payment.booking_id,
        paymentId: payment.id,
        currentStatus: payment.status,
        originalAmount: payment.amount,
        depositAmount: payment.deposit_amount,
        serviceFee: payment.service_fee,
      });

      // Calculate refund amount in dollars from charge data
      const refundAmountDollars = charge.amount_refunded / 100;
      const refundReason =
        charge.refunds?.data[0]?.reason || 'Manual refund via Stripe dashboard';

      // Update payment status to refunded with complete refund information
      const { error: updateError } = await supabase
        .from('booking_payments')
        .update({
          status: 'refunded',
          refunded_amount: refundAmountDollars,
          refund_reason: refundReason,
          refunded_at: new Date().toISOString(),
          refund_transaction_id: charge.refunds?.data[0]?.id || charge.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error(
          `[Webhook] ❌ Error updating payment status to refunded for ${payment.booking_id}:`,
          updateError,
        );
        return;
      }

      console.log(
        `[Webhook] ✅ Updated payment status to refunded for booking ${payment.booking_id} - Amount: $${refundAmountDollars}`,
      );

      // Also update booking status to cancelled if not already
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.booking_id)
        .neq('status', 'cancelled'); // Only update if not already cancelled

      if (bookingError) {
        console.error(
          `[Webhook] ❌ Error updating booking status for ${payment.booking_id}:`,
          bookingError,
        );
      } else {
        console.log(
          `[Webhook] ✅ Updated booking status to cancelled for ${payment.booking_id}`,
        );
      }

      // Find and update related support request to mark as completed
      const { data: supportRequest, error: supportRequestError } =
        await supabase
          .from('support_requests')
          .select('id, conversation_id, professional_id')
          .eq('booking_id', payment.booking_id)
          .eq('status', 'in_progress')
          .single();

      if (supportRequest && !supportRequestError) {
        console.log(
          `[Webhook] Found related support request ${supportRequest.id} for booking ${payment.booking_id}`,
        );

        // Update support request to completed/resolved
        const { error: supportUpdateError } = await supabase
          .from('support_requests')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: supportRequest.professional_id,
            refund_amount: refundAmountDollars,
            stripe_refund_id: charge.refunds?.data[0]?.id || null,
            processed_at: new Date().toISOString(),
            resolution_notes: 'Refund processed via Stripe dashboard',
            updated_at: new Date().toISOString(),
          })
          .eq('id', supportRequest.id);

        if (supportUpdateError) {
          console.error(
            `[Webhook] ❌ Error updating support request status:`,
            supportUpdateError,
          );
        } else {
          console.log(
            `[Webhook] ✅ Updated support request ${supportRequest.id} to resolved status`,
          );

          // Add a message to the conversation about the refund completion
          if (
            supportRequest.conversation_id &&
            supportRequest.professional_id
          ) {
            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                conversation_id: supportRequest.conversation_id,
                sender_id: supportRequest.professional_id,
                content: `Refund of $${refundAmountDollars.toFixed(2)} has been successfully processed via Stripe dashboard.`,
              });

            if (messageError) {
              console.error(
                '[Webhook] ❌ Error creating refund completion message:',
                messageError,
              );
            } else {
              console.log(
                '[Webhook] ✅ Added refund completion message to conversation',
              );
            }
          }

          // Revalidate the support request page to refresh the UI
          try {
            revalidatePath(`/support-request/${supportRequest.id}`);
            revalidatePath('/dashboard/support-requests'); // Also refresh the support requests list
            console.log(
              `[Webhook] ✅ Revalidated support request page paths for ${supportRequest.id}`,
            );
          } catch (revalidateError) {
            console.error(
              '[Webhook] ❌ Error revalidating paths:',
              revalidateError,
            );
          }
        }
      } else if (
        supportRequestError &&
        supportRequestError.code !== 'PGRST116'
      ) {
        console.error(
          `[Webhook] ❌ Error checking for support request:`,
          supportRequestError,
        );
      } else {
        console.log(
          `[Webhook] ℹ️ No in-progress support request found for booking ${payment.booking_id}`,
        );
      }

      console.log(
        `[Webhook] ✅ Successfully processed refund for booking ${payment.booking_id}`,
      );
    } catch (error) {
      console.error(
        `[Webhook] ❌ Error handling refund for payment intent ${paymentIntentId}:`,
        error,
      );
    }
  } else {
    console.log(
      `[Webhook] ℹ️ Charge ${charge.id} has no associated payment intent, skipping refund processing`,
    );
  }
}

// Handle refund events from our refund system
async function handleRefundEvent(refund: Stripe.Refund) {
  console.log(`[Webhook] 💰 Processing refund event:`, {
    refundId: refund.id,
    status: refund.status,
    amount: refund.amount,
    reason: refund.reason,
    metadata: refund.metadata,
    payment_intent: refund.payment_intent,
  });

  try {
    const { handleStripeRefundWebhook } = await import(
      '@/server/domains/refunds/stripe-refund'
    );

    console.log(`[Webhook] Processing refund through webhook handler`);
    const result = await handleStripeRefundWebhook(refund);

    if (!result.success) {
      console.error(`[Webhook] ❌ Failed to process refund webhook:`, {
        refundId: refund.id,
        error: result.error,
      });
      return;
    }

    console.log(`[Webhook] ✅ Successfully processed refund webhook:`, {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
    });

    // If refund succeeded, try to revalidate related support request pages
    if (refund.status === 'succeeded') {
      try {
        // Try to get support request ID from metadata first
        const supportRequestId = refund.metadata?.support_request_id;

        if (supportRequestId) {
          console.log(
            `[Webhook] Revalidating pages for support request: ${supportRequestId}`,
          );
          revalidatePath(`/support-request/${supportRequestId}`);
          revalidatePath('/dashboard/support-requests');
          console.log(
            `[Webhook] ✅ Revalidated support request page paths for ${supportRequestId}`,
          );
        } else {
          // If no support request ID in metadata, we need to find it by payment intent
          // For now, we'll just revalidate the general support requests page
          console.log(
            `[Webhook] No support request ID in metadata, revalidating general pages`,
          );
          revalidatePath('/dashboard/support-requests');
          console.log(`[Webhook] ✅ Revalidated general support request pages`);
        }
      } catch (revalidateError) {
        console.error(
          '[Webhook] ❌ Error revalidating paths in refund event:',
          revalidateError,
        );
      }
    }
  } catch (error) {
    console.error(`[Webhook] ❌ Error handling refund event:`, {
      refundId: refund.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Handle successful setup intent (saved payment method)
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  console.log(`Setup intent ${setupIntent.id} succeeded`);

  const bookingId = setupIntent.metadata?.booking_id;
  const customerId = setupIntent.customer as string;
  const paymentMethodId = setupIntent.payment_method as string;

  if (!customerId || !bookingId || !paymentMethodId) {
    console.error('Missing required data from setup intent:', {
      customerId,
      bookingId,
      paymentMethodId,
    });
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
      console.log(
        `Setup intent succeeded for user ${customer.user_id}, booking ${bookingId} - payment method ${paymentMethodId} saved`,
      );

      // Check if this is a deposit setup intent
      const depositAmount = setupIntent.metadata?.deposit_amount;
      const balanceAmount = setupIntent.metadata?.balance_amount;
      const professionalStripeAccountId =
        setupIntent.metadata?.professional_stripe_account_id;

      if (depositAmount && balanceAmount && professionalStripeAccountId) {
        console.log(
          `🔍 Processing deposit + balance flow - Deposit: $${depositAmount}, Balance: $${balanceAmount}`,
        );

        // Get payment method type from metadata to determine balance calculation
        const paymentMethodType = setupIntent.metadata?.payment_method_type;
        const isOnlinePayment = paymentMethodType === 'card';

        // Step 1: Immediately charge the deposit with 3% professional fee
        try {
          // NEW FEE STRUCTURE: Apply 3% professional fee to deposit
          const { getProfessionalFeePercentage } = await import(
            '@/server/lib/service-fee'
          );
          const professionalFeePercentage =
            await getProfessionalFeePercentage();
          const depositAmountCents = parseInt(depositAmount);
          const professionalFee = Math.round(
            depositAmountCents * (professionalFeePercentage / 100),
          );

          const depositPaymentIntent = await stripe.paymentIntents.create({
            amount: depositAmountCents,
            currency: 'usd',
            customer: customerId,
            payment_method: paymentMethodId,
            confirmation_method: 'automatic',
            confirm: true,
            off_session: true,
            // For deposits: Apply 3% professional fee (client service fee already in deposit amount)
            application_fee_amount: professionalFee,
            transfer_data: {
              destination: professionalStripeAccountId,
            },
            on_behalf_of: professionalStripeAccountId,
            metadata: {
              booking_id: bookingId,
              payment_type: 'immediate_deposit_via_setup',
            },
          });

          console.log(
            `✅ Deposit charged: $${parseInt(depositAmount) / 100} (Payment Intent: ${depositPaymentIntent.id})`,
          );

          // Step 2: Check timing to determine if balance payment should be created now or scheduled
          // Get appointment timing from metadata or fetch from database
          const appointmentTiming = setupIntent.metadata?.appointment_timing;
          let shouldPreAuthNow = false;

          if (appointmentTiming) {
            // Use pre-calculated timing from metadata
            shouldPreAuthNow = appointmentTiming === 'immediate';
            console.log(
              `🔍 Using pre-calculated timing: ${shouldPreAuthNow ? 'immediate' : 'scheduled'}`,
            );
          } else {
            // Calculate timing by fetching appointment data
            const { data: appointmentData } = await supabase
              .from('appointments')
              .select('start_time, end_time')
              .eq('booking_id', bookingId)
              .single();

            if (appointmentData) {
              const { schedulePaymentAuthorization } = await import(
                '@/server/domains/stripe-payments/stripe-operations'
              );
              const scheduleResult = await schedulePaymentAuthorization(
                bookingId,
                new Date(appointmentData.start_time),
                new Date(appointmentData.end_time),
              );
              shouldPreAuthNow = scheduleResult.shouldPreAuthNow || false;
              console.log(
                `🔍 Calculated timing: ${shouldPreAuthNow ? 'immediate' : 'scheduled'}`,
              );
            }
          }

          // NEW FEE STRUCTURE: Client service fee is now in deposit
          // For cash payments: balance = 0 (service fee already charged with deposit, service paid in cash)
          // For card payments: balance = remaining amount (service + tips, no service fee)
          let uncapturedBalanceAmount: number;

          if (isOnlinePayment) {
            // Card payment: charge full balance amount (no service fee, that's in deposit)
            uncapturedBalanceAmount = parseInt(balanceAmount);
            console.log(
              `🔍 Card payment - balance amount: $${uncapturedBalanceAmount / 100}`,
            );
          } else {
            // Cash payment: balance is 0 (service fee already charged with deposit)
            uncapturedBalanceAmount = 0;
            console.log(
              `🔍 Cash payment - balance amount: $0 (service fee charged with deposit)`,
            );
          }

          if (shouldPreAuthNow && uncapturedBalanceAmount > 0) {
            // Appointment ≤6 days: Create uncaptured payment intent immediately (if balance > 0)
            console.log(
              `⏰ Appointment ≤6 days - creating uncaptured balance payment immediately`,
            );

            const { createUncapturedPaymentIntent } = await import(
              '@/server/domains/stripe-payments/stripe-operations'
            );

            const uncapturedResult = await createUncapturedPaymentIntent(
              uncapturedBalanceAmount,
              customerId,
              professionalStripeAccountId,
              {
                booking_id: bookingId,
                payment_type: 'deposit_balance_uncaptured',
                deposit_payment_intent_id: depositPaymentIntent.id,
              },
              paymentMethodId,
            );

            if (uncapturedResult.success && uncapturedResult.paymentIntentId) {
              console.log(
                `✅ Uncaptured balance payment created: ${uncapturedResult.paymentIntentId}`,
              );

              // Update booking payment with both payment intent IDs
              console.log(
                `📝 Updating booking payment with payment intent IDs:`,
                {
                  bookingId,
                  depositPaymentIntentId: depositPaymentIntent.id,
                  balancePaymentIntentId: uncapturedResult.paymentIntentId,
                },
              );

              const { error: updateError } = await supabase
                .from('booking_payments')
                .update({
                  deposit_payment_intent_id: depositPaymentIntent.id,
                  stripe_payment_intent_id: uncapturedResult.paymentIntentId,
                  capture_method: 'manual',
                  status: 'authorized', // Deposit paid, balance authorized
                  stripe_payment_method_id: paymentMethodId,
                  balance_amount: uncapturedBalanceAmount / 100,
                  updated_at: new Date().toISOString(),
                })
                .eq('booking_id', bookingId);

              if (updateError) {
                console.error(
                  `❌ Failed to update booking payment with payment intent IDs:`,
                  updateError,
                );
              } else {
                console.log(
                  `✅ Successfully updated booking payment with payment intent IDs for booking ${bookingId}`,
                );
              }
            } else {
              console.error(
                `❌ Failed to create uncaptured payment for balance: ${uncapturedResult.error}`,
              );
            }
          } else if (shouldPreAuthNow && uncapturedBalanceAmount === 0) {
            // Cash payment with deposit - no balance payment needed
            console.log(
              `⏰ Cash payment - no balance payment needed (service fee charged with deposit)`,
            );

            const { error: updateError } = await supabase
              .from('booking_payments')
              .update({
                deposit_payment_intent_id: depositPaymentIntent.id,
                status: 'paid', // Deposit paid, no balance needed
                stripe_payment_method_id: paymentMethodId,
                balance_amount: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('booking_id', bookingId);

            if (updateError) {
              console.error(
                `❌ Failed to update booking payment:`,
                updateError,
              );
            } else {
              console.log(
                `✅ Successfully updated booking payment for cash payment with deposit`,
              );
            }
          } else if (!shouldPreAuthNow && uncapturedBalanceAmount > 0) {
            // Appointment >6 days: Schedule balance payment for cron job (if balance > 0)
            console.log(
              `⏰ Appointment >6 days - scheduling balance payment for cron job`,
            );

            // Update booking payment with deposit info and schedule balance payment
            const { updateBookingPaymentWithScheduledBalance } = await import(
              '@/server/domains/stripe-payments/db'
            );

            // Get appointment data for scheduling
            const { data: appointmentData } = await supabase
              .from('appointments')
              .select('start_time, end_time')
              .eq('booking_id', bookingId)
              .single();

            if (appointmentData) {
              const { schedulePaymentAuthorization } = await import(
                '@/server/domains/stripe-payments/stripe-operations'
              );
              const scheduleResult = await schedulePaymentAuthorization(
                bookingId,
                new Date(appointmentData.start_time),
                new Date(appointmentData.end_time),
              );

              if (scheduleResult.success) {
                await updateBookingPaymentWithScheduledBalance(
                  bookingId,
                  scheduleResult.captureDate!,
                  uncapturedBalanceAmount / 100, // Convert to dollars
                  'pending_balance_payment',
                );

                // Also update with deposit payment intent ID
                console.log(
                  `📝 Updating booking payment with deposit payment intent ID and scheduling:`,
                  {
                    bookingId,
                    depositPaymentIntentId: depositPaymentIntent.id,
                    preAuthScheduledFor:
                      scheduleResult.preAuthDate!.toISOString(),
                  },
                );

                const { error: depositUpdateError } = await supabase
                  .from('booking_payments')
                  .update({
                    deposit_payment_intent_id: depositPaymentIntent.id,
                    stripe_payment_method_id: paymentMethodId, // Save for cron job
                    pre_auth_scheduled_for:
                      scheduleResult.preAuthDate!.toISOString(),
                    amount: uncapturedBalanceAmount / 100, // Set amount that cron will process
                    updated_at: new Date().toISOString(),
                  })
                  .eq('booking_id', bookingId);

                if (depositUpdateError) {
                  console.error(
                    `❌ Failed to update booking payment with deposit payment intent ID:`,
                    depositUpdateError,
                  );
                } else {
                  console.log(
                    `✅ Successfully updated booking payment with deposit payment intent ID for booking ${bookingId}`,
                  );
                }

                console.log(
                  `✅ Balance payment scheduled for ${scheduleResult.preAuthDate?.toISOString()}`,
                );
              } else {
                console.error(
                  `❌ Failed to schedule balance payment: ${scheduleResult.error}`,
                );
              }
            }
          } else if (!shouldPreAuthNow && uncapturedBalanceAmount === 0) {
            // Cash payment with deposit, >6 days - no balance payment needed
            console.log(
              `⏰ Cash payment >6 days - no balance payment needed (service fee charged with deposit)`,
            );

            const { error: updateError } = await supabase
              .from('booking_payments')
              .update({
                deposit_payment_intent_id: depositPaymentIntent.id,
                stripe_payment_method_id: paymentMethodId,
                status: 'paid', // Deposit paid, no balance needed
                balance_amount: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('booking_id', bookingId);

            if (updateError) {
              console.error(
                `❌ Failed to update booking payment:`,
                updateError,
              );
            } else {
              console.log(
                `✅ Successfully updated booking payment for cash payment with deposit (>6 days)`,
              );
            }
          }
        } catch (error) {
          console.error(
            '❌ Error processing deposit + balance payments:',
            error,
          );
        }
      } else {
        // Regular setup intent (no deposit) - just save payment method for later processing
        console.log(
          `🔍 Regular setup intent - saving payment method for future payment`,
        );

        // Update payment status to pending and save the payment method ID for cron job
        console.log(
          `📝 Updating booking payment with payment method ID for regular setup:`,
          {
            bookingId,
            paymentMethodId,
          },
        );

        const { error: regularUpdateError } = await supabase
          .from('booking_payments')
          .update({
            status: 'pending',
            stripe_payment_method_id: paymentMethodId, // Save payment method ID for cron job
            updated_at: new Date().toISOString(),
          })
          .eq('booking_id', bookingId);

        if (regularUpdateError) {
          console.error(
            `❌ Failed to update booking payment with payment method ID:`,
            regularUpdateError,
          );
        } else {
          console.log(
            `✅ Successfully updated booking payment with payment method ID for booking ${bookingId}`,
          );
        }
      }

      // Update booking status to confirmed since payment method is now saved
      console.log(
        `📝 Updating booking status to confirmed for booking ${bookingId}`,
      );

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error(
          `❌ Failed to update booking status to confirmed:`,
          bookingUpdateError,
        );
      } else {
        console.log(
          `✅ Successfully updated booking status to confirmed for booking ${bookingId}`,
        );
      }

      // Track booking completed activity
      try {
        // Get booking details for activity tracking
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(
            `
            id,
            client_id,
            professional_profile_id,
            booking_services(
              service_id,
              services(
                id,
                name,
                price
              )
            )
          `,
          )
          .eq('id', bookingId)
          .single();

        if (
          bookingData &&
          bookingData.booking_services &&
          bookingData.booking_services.length > 0
        ) {
          const mainService = bookingData.booking_services[0]?.services;
          if (mainService) {
            await trackActivity({
              activityType: 'booking_completed',
              entityType: 'booking',
              entityId: bookingId,
              metadata: {
                service_id: mainService.id,
                service_name: mainService.name,
                service_price: mainService.price,
                professional_profile_id: bookingData.professional_profile_id,
                payment_method: 'setup_intent',
                source: 'webhook_confirmation',
              },
            });
            console.log(
              `✅ Booking completed activity tracked for booking ${bookingId}`,
            );
          }
        }
      } catch (trackingError) {
        console.error(
          `❌ Failed to track booking completion for ${bookingId}:`,
          trackingError,
        );
        // Don't fail the webhook for tracking errors
      }

      // Send booking confirmation emails only if this is NOT a dual payment flow
      // (for dual payment flow, emails will be sent by the capturable updated handler)
      try {
        // Check if this booking has a separate balance payment intent (dual payment)
        const { data: paymentData } = await supabase
          .from('booking_payments')
          .select('stripe_payment_intent_id, deposit_payment_intent_id')
          .eq('booking_id', bookingId)
          .single();

        const isDualPayment =
          paymentData?.deposit_payment_intent_id &&
          paymentData?.stripe_payment_intent_id;

        if (!isDualPayment) {
          // This is a deposit-only or full payment scenario - send emails now
          await sendConfirmationEmailsForBooking(
            bookingId,
            'deposit-only payment processed',
          );
        } else {
          console.log(
            `⏭️ Skipping emails for dual payment booking ${bookingId} - will be sent by capturable handler`,
          );
        }
      } catch (emailError) {
        console.error(
          `❌ Failed to send booking confirmation emails for ${bookingId}:`,
          emailError,
        );
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
    console.log(
      `Setup intent failed for booking ${bookingId} - payment method not saved`,
    );
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
      console.error(
        `Failed to delete expired booking ${bookingId}:`,
        deleteError,
      );

      // Fallback: update payment status to failed
      await supabase
        .from('booking_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('stripe_checkout_session_id', session.id);
    } else {
      console.log(
        `Successfully deleted expired booking ${bookingId} and freed up the time slot`,
      );
    }
  } catch (error) {
    console.error(
      `Error handling expired checkout session: ${bookingId}`,
      error,
    );
  }
}

// Handle split payment partial capture - capture service fee, leave service amount uncaptured
async function handleSplitPaymentPartialCapture(
  session: Stripe.Checkout.Session,
  bookingId: string,
) {
  try {
    const supabase = createAdminClient();

    // Extract metadata
    const serviceAmount = parseInt(session.metadata?.service_amount || '0');
    const serviceFee = parseInt(session.metadata?.service_fee || '0');
    const professionalStripeAccountId =
      session.metadata?.professional_stripe_account_id;

    if (!serviceAmount || !serviceFee || !professionalStripeAccountId) {
      console.error(
        '❌ Missing required data for split payment partial capture',
      );
      return;
    }

    console.log(
      `🔍 Split payment partial capture - Total: $${(serviceAmount + serviceFee) / 100}, Service fee: $${serviceFee / 100}, Service amount: $${serviceAmount / 100}`,
    );

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      console.error('❌ No payment intent ID found for split payment');
      return;
    }

    // With application_fee_amount structure, partial capture should work better
    // Capture only the service fee (platform keeps this)
    const captureResult = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: serviceFee, // Only capture service fee for platform
    });

    console.log(
      `✅ Partially captured service fee using application_fee_amount structure: $${captureResult.amount_received / 100} for platform, Service amount: $${serviceAmount / 100} remains uncaptured for professional`,
    );

    // Log the payment intent structure for debugging
    const updatedPaymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`[Split Payment] Payment intent after partial capture:`, {
      amount: updatedPaymentIntent.amount,
      amount_received: updatedPaymentIntent.amount_received,
      amount_capturable: updatedPaymentIntent.amount_capturable,
      application_fee_amount: updatedPaymentIntent.application_fee_amount,
      status: updatedPaymentIntent.status,
    });

    // The remaining $serviceAmount is still uncaptured and can be:
    // 1. Fully captured later (professional gets full service amount)
    // 2. Partially captured for cancellation fees (professional gets percentage)
    // 3. Cancelled completely (customer gets full refund of service amount)

    // Note: Payment method ID will be handled by the main checkout handler
    // Just update the booking payment with the payment intent ID
    await supabase
      .from('booking_payments')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed', // Booking is confirmed even though service amount is uncaptured
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId);

    console.log('✅ Updated booking payment record with split payment info');

    // Send confirmation emails for split payment flow
    await sendConfirmationEmailsForBooking(
      bookingId,
      'split payment processed',
    );
  } catch (error) {
    console.error('❌ Error processing split payment partial capture:', error);
  }
}

// Handle payment_intent.amount_capturable_updated event
async function handlePaymentIntentCapturableUpdated(
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    if (paymentIntent.status !== 'requires_capture') {
      console.log(
        'Payment intent not in requires_capture state:',
        paymentIntent.status,
      );
      return;
    }

    const bookingId = paymentIntent.metadata.booking_id;
    if (!bookingId) {
      console.error('❌ No booking ID found in payment intent metadata');
      return;
    }

    console.log(`💳 Payment authorized for booking ${bookingId}`);

    const supabase = createAdminClient();

    // For dual payment flows (deposit + balance), emails should be sent when balance is authorized
    // The logic below will determine if this is the correct payment intent to trigger emails

    // Get appointment details
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, booking_id')
      .eq('booking_id', bookingId)
      .single();

    if (appointmentError || !appointmentData) {
      console.error('❌ Error fetching appointment:', appointmentError);
      return;
    }

    // Send booking confirmation emails
    try {
      // Get payment data to determine if this is a dual payment scenario
      const { data: fullPaymentData } = await supabase
        .from('booking_payments')
        .select('stripe_payment_intent_id, deposit_payment_intent_id, id')
        .eq('booking_id', bookingId)
        .single();

      if (
        fullPaymentData?.deposit_payment_intent_id &&
        fullPaymentData?.stripe_payment_intent_id
      ) {
        // Dual payment scenario - only send emails when the balance payment is authorized
        if (fullPaymentData.stripe_payment_intent_id === paymentIntent.id) {
          await sendConfirmationEmailsForBooking(
            bookingId,
            'dual payment - balance payment authorized',
          );
        } else {
          console.log(
            `⏭️ Skipping emails - payment intent ${paymentIntent.id} is the deposit payment, waiting for balance payment authorization`,
          );
        }
      } else {
        // Single payment scenario - send emails for any payment authorization
        await sendConfirmationEmailsForBooking(
          bookingId,
          'single payment authorized',
        );
      }
    } catch (emailError) {
      console.error(
        `❌ Failed to send booking confirmation emails for ${bookingId}:`,
        emailError,
      );
      // Don't fail the webhook for email errors
    }
  } catch (error) {
    console.error(
      'Error handling payment_intent.amount_capturable_updated:',
      error,
    );
  }
}
