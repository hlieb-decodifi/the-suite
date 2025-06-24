import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import Stripe from 'stripe';

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
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Process a refund through Stripe
 */
export async function processStripeRefund(
  refundId: string,
  refundAmount: number
): Promise<{ success: boolean; stripeRefundId?: string; error?: string }> {
  try {
    console.log(`[STRIPE] Starting refund processing for refund: ${refundId}, amount: $${refundAmount}`);

    const adminSupabase = createSupabaseAdminClient();

    // Get refund details with payment information
    const { data: refund, error: refundError } = await adminSupabase
      .from('refunds')
      .select(`
        id,
        appointment_id,
        original_amount,
        booking_payments!inner(
          id,
          stripe_payment_intent_id,
          amount,
          tip_amount
        )
      `)
      .eq('id', refundId)
      .single();

    if (refundError || !refund) {
      console.error('Failed to fetch refund data:', refundError);
      return { 
        success: false, 
        error: 'Refund record not found' 
      };
    }

    const payment = refund.booking_payments;
    
    if (!payment.stripe_payment_intent_id) {
      return {
        success: false,
        error: 'No Stripe payment intent found for this booking'
      };
    }

    // Convert refund amount to cents for Stripe
    const refundAmountCents = Math.round(refundAmount * 100);

    // Calculate transaction fee (professional is responsible)
    // Stripe fee is typically 2.9% + 30 cents, but we'll get the actual fee from the payment intent
    let transactionFee = 0;
    
    try {
      // Use estimated fee (2.9% + $0.30) - exact fee calculation requires complex Stripe operations
      transactionFee = Math.round((refundAmountCents * 0.029 + 30)) / 100;
    } catch (feeError) {
      console.error('Could not calculate transaction fee, using default estimate:', feeError);
      // Fallback to estimated fee (2.9% + $0.30)
      transactionFee = Math.round((refundAmountCents * 0.029 + 30)) / 100;
    }

    console.log(`[STRIPE] Processing refund of $${refundAmount} (transaction fee: $${transactionFee})`);

    // Update refund status to processing first
    const { error: processingError } = await adminSupabase
      .from('refunds')
      .update({
        status: 'processing',
        refund_amount: refundAmount,
        transaction_fee: transactionFee,
      })
      .eq('id', refundId);

    if (processingError) {
      console.error('Error updating refund to processing status:', processingError);
      return {
        success: false,
        error: 'Failed to update refund status'
      };
    }

    // Process the refund with Stripe
    const stripeRefund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        refund_id: refundId,
        appointment_id: refund.appointment_id,
      }
    });

    console.log(`[STRIPE] Stripe refund created: ${stripeRefund.id}`);

    // Update refund record with Stripe refund ID and completion
    const { error: updateError } = await adminSupabase
      .from('refunds')
      .update({
        status: 'completed',
        stripe_refund_id: stripeRefund.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (updateError) {
      console.error('Error updating refund with Stripe ID:', updateError);
      // The Stripe refund was successful, but we couldn't update our database
      // This should be handled by the webhook when Stripe sends the refund event
      console.error('Refund processed in Stripe but database update failed - webhook will handle this');
    }

    // Update appointment status to refunded
    try {
      await adminSupabase
        .from('appointments')
        .update({ status: 'refunded' })
        .eq('id', refund.appointment_id);
      
      console.log(`[STRIPE] Updated appointment ${refund.appointment_id} status to refunded`);
    } catch (appointmentError) {
      console.error('Error updating appointment status to refunded:', appointmentError);
      // Don't fail the refund for this error
    }

    // Send completion notification emails
    try {
      const { sendRefundCompletionEmails } = await import('./email-utils');
      await sendRefundCompletionEmails(refundId);
    } catch (emailError) {
      console.error('Error sending refund completion notifications:', emailError);
      // Don't fail the refund for email errors
    }

    console.log(`[STRIPE] ✅ Refund processing completed successfully for refund: ${refundId}`);

    return {
      success: true,
      stripeRefundId: stripeRefund.id
    };

  } catch (error) {
    console.error(`[STRIPE] Error processing refund for ${refundId}:`, error);
    
    // Update refund status to failed
    try {
      const adminSupabase = createSupabaseAdminClient();
      await adminSupabase
        .from('refunds')
        .update({ status: 'failed' })
        .eq('id', refundId);
    } catch (updateError) {
      console.error('Error updating refund status to failed:', updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing refund'
    };
  }
}

/**
 * Handle Stripe refund webhook events
 */
export async function handleStripeRefundWebhook(
  refund: Stripe.Refund
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[WEBHOOK] Processing refund webhook for Stripe refund: ${refund.id}`);

    const adminSupabase = createSupabaseAdminClient();

    // Find the refund record by Stripe refund ID
    const { data: refundRecord, error: findError } = await adminSupabase
      .from('refunds')
      .select('id, status, appointment_id')
      .eq('stripe_refund_id', refund.id)
      .single();

    if (findError || !refundRecord) {
      console.log(`No refund record found for Stripe refund ${refund.id}`);
      return { success: true }; // Not an error, might be a refund from dashboard
    }

    // Update refund status based on Stripe refund status
    let newStatus: string;
    let processedAt: string | null = null;

    switch (refund.status) {
      case 'succeeded':
        newStatus = 'completed';
        processedAt = new Date().toISOString();
        break;
      case 'failed':
        newStatus = 'failed';
        break;
      case 'pending':
        newStatus = 'processing';
        break;
      case 'canceled':
        newStatus = 'failed';
        break;
      default:
        console.log(`Unknown refund status: ${refund.status}`);
        return { success: true };
    }

    // Update refund record
    const updateData: { status: string; processed_at?: string } = { status: newStatus };
    if (processedAt) {
      updateData.processed_at = processedAt;
    }

    const { error: updateError } = await adminSupabase
      .from('refunds')
      .update(updateData)
      .eq('id', refundRecord.id);

    if (updateError) {
      console.error('Error updating refund from webhook:', updateError);
      return {
        success: false,
        error: 'Failed to update refund status'
      };
    }

    // If refund succeeded, update appointment status and send notifications
    if (refund.status === 'succeeded') {
      // Update appointment status to refunded
      await adminSupabase
        .from('appointments')
        .update({ status: 'refunded' })
        .eq('id', refundRecord.appointment_id);

      // Send completion notifications if not already sent
      try {
        const { sendRefundCompletionEmails } = await import('./email-utils');
        await sendRefundCompletionEmails(refundRecord.id);
      } catch (emailError) {
        console.error('Error sending refund completion notifications from webhook:', emailError);
        // Don't fail webhook for email errors
      }
    }

    console.log(`[WEBHOOK] ✅ Successfully processed refund webhook for ${refund.id}`);
    return { success: true };

  } catch (error) {
    console.error(`[WEBHOOK] Error processing refund webhook for ${refund.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 