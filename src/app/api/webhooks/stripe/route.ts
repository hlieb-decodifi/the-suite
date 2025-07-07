import Stripe from 'stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Create admin client for operations that need elevated permissions
function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient<Database>(supabaseUrl, supabaseServiceKey);
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
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`[Webhook] ✅ Verified Stripe signature for event: ${event.type}`);
  } catch (err) {
    console.error('[Webhook] ❌ Invalid Stripe signature:', err instanceof Error ? err.message : err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`[Webhook] 🔄 Processing event type: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed':
        console.log(`[Webhook] 💳 Handling payment intent event: ${event.type}`);
        await handlePaymentIntentEvent(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        console.log(`[Webhook] 💰 Handling charge refund event`);
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'refund.created':
      case 'refund.failed':
        console.log(`[Webhook] 💰 Handling refund event: ${event.type}`);
        await handleRefundEvent(event.data.object as Stripe.Refund);
        break;

      default:
        console.log(`[Webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log(`[Webhook] ✅ Successfully processed webhook event: ${event.type}`);
    return new Response('Processed', { status: 200 });
  } catch (error) {
    console.error(`[Webhook] ❌ Error processing webhook:`, {
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response('Error processing webhook', { status: 500 });
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
    metadata: charge.metadata
  });
  
  // If charge is associated with a payment intent, use the payment intent ID
  if (charge.payment_intent) {
    const paymentIntentId = typeof charge.payment_intent === 'string' 
      ? charge.payment_intent 
      : charge.payment_intent.id;
    
    console.log(`[Webhook] Charge ${charge.id} refunded - associated with payment intent ${paymentIntentId}`);
    
    try {
      const supabase = createSupabaseAdminClient();
      
      // Find the booking payment by stripe payment intent ID
      const { data: payment, error: findError } = await supabase
        .from('booking_payments')
        .select('id, booking_id, status, amount, deposit_amount, service_fee')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();
      
      if (findError || !payment) {
        console.log(`[Webhook] ❌ No booking payment found for refunded payment intent ${paymentIntentId}`);
        return;
      }

      console.log(`[Webhook] Found booking payment:`, {
        bookingId: payment.booking_id,
        paymentId: payment.id,
        currentStatus: payment.status,
        originalAmount: payment.amount,
        depositAmount: payment.deposit_amount,
        serviceFee: payment.service_fee
      });
      
      // Update payment status to refunded
      const { error: updateError } = await supabase
        .from('booking_payments')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
      
      if (updateError) {
        console.error(`[Webhook] ❌ Error updating payment status to refunded for ${payment.booking_id}:`, updateError);
        return;
      }
      
      console.log(`[Webhook] ✅ Updated payment status to refunded for booking ${payment.booking_id}`);
      
      // Also update booking status to cancelled if not already
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking_id)
        .neq('status', 'cancelled'); // Only update if not already cancelled
      
      if (bookingError) {
        console.error(`[Webhook] ❌ Error updating booking status for ${payment.booking_id}:`, bookingError);
      } else {
        console.log(`[Webhook] ✅ Updated booking status to cancelled for ${payment.booking_id}`);
      }
      
      console.log(`[Webhook] ✅ Successfully processed refund for booking ${payment.booking_id}`);
    } catch (error) {
      console.error(`[Webhook] ❌ Error handling refund for payment intent ${paymentIntentId}:`, error);
    }
  } else {
    console.log(`[Webhook] ℹ️ Charge ${charge.id} has no associated payment intent, skipping refund processing`);
  }
}

// Handle refund events from our refund system
async function handleRefundEvent(refund: Stripe.Refund) {
  console.log(`[Webhook] 💰 Processing refund event:`, {
    refundId: refund.id,
    status: refund.status,
    amount: refund.amount,
    reason: refund.reason,
    metadata: refund.metadata
  });
  
  try {
    const { handleStripeRefundWebhook } = await import('@/server/domains/refunds/stripe-refund');
    
    console.log(`[Webhook] Processing refund through webhook handler`);
    const result = await handleStripeRefundWebhook(refund);
    
    if (!result.success) {
      console.error(`[Webhook] ❌ Failed to process refund webhook:`, {
        refundId: refund.id,
        error: result.error
      });
      return;
    }
    
    console.log(`[Webhook] ✅ Successfully processed refund webhook:`, {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount
    });
  } catch (error) {
    console.error(`[Webhook] ❌ Error handling refund event:`, {
      refundId: refund.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle payment intent events
async function handlePaymentIntentEvent(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Webhook] 💳 Processing payment intent event:`, {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    captureMethod: paymentIntent.capture_method,
    metadata: paymentIntent.metadata
  });

  try {
    const supabase = createSupabaseAdminClient();

    // Find the booking payment by payment intent ID
    const { data: payment, error: findError } = await supabase
      .from('booking_payments')
      .select(`
        id,
        booking_id,
        amount,
        deposit_amount,
        service_fee,
        status,
        pre_auth_scheduled_for,
        capture_scheduled_for
      `)
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (findError) {
      console.error(`[Webhook] ❌ Error finding booking payment:`, findError);
      return;
    }

    if (!payment) {
      console.log(`[Webhook] ℹ️ No booking payment found for payment intent ${paymentIntent.id}`);
      return;
    }

    console.log(`[Webhook] 📝 Found booking payment:`, {
      paymentId: payment.id,
      bookingId: payment.booking_id,
      currentStatus: payment.status,
      amount: payment.amount,
      depositAmount: payment.deposit_amount,
      serviceFee: payment.service_fee,
      preAuthScheduled: payment.pre_auth_scheduled_for,
      captureScheduled: payment.capture_scheduled_for
    });

    // Handle different payment intent statuses
    switch (paymentIntent.status) {
      case 'succeeded':
        console.log(`[Webhook] ✅ Payment intent succeeded - updating payment status`);
        await supabase
          .from('booking_payments')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
        break;

      case 'requires_capture':
        console.log(`[Webhook] ⏳ Payment intent requires capture - no action needed`);
        break;

      case 'canceled':
        console.log(`[Webhook] 🚫 Payment intent cancelled - updating payment status`);
        await supabase
          .from('booking_payments')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
        break;

      case 'requires_payment_method':
        console.log(`[Webhook] ⚠️ Payment intent requires payment method - marking as failed`);
        await supabase
          .from('booking_payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
        break;

      default:
        console.log(`[Webhook] ℹ️ Unhandled payment intent status: ${paymentIntent.status}`);
    }

    console.log(`[Webhook] ✅ Successfully processed payment intent webhook for ${paymentIntent.id}`);

  } catch (error) {
    console.error(`[Webhook] ❌ Error processing payment intent webhook:`, {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 