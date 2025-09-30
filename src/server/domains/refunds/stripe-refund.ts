import Stripe from 'stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Process a refund through Stripe for a support request
 * Handles both deposit and balance payments correctly
 * @param supportRequestId The ID of the support request
 * @param refundAmount The amount to refund (in dollars)
 * @returns Success status and error message if applicable
 */
export async function processStripeRefund(
  supportRequestId: string,
  refundAmount: number
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  console.log(`[REFUND] Processing refund for support request ${supportRequestId}, amount: $${refundAmount}`);
  
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get the support request with payment details
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', supportRequestId)
      .single();
      
    if (supportRequestError || !supportRequest) {
      console.error('[REFUND] Error fetching support request:', supportRequestError);
      return {
        success: false,
        error: 'Support request not found',
      };
    }
    
    // Get booking payment details - try booking_payment_id first, then fallback to other relationships
    let bookingPayment: {
      id: string;
      deposit_payment_intent_id?: string | null;
      stripe_payment_intent_id?: string | null;
      deposit_amount?: number | null;
      balance_amount?: number | null;
      amount?: number | null;
      status?: string | null;
    } | null = null;
    
    if (supportRequest.booking_payment_id) {
      console.log('[REFUND] Using booking_payment_id:', supportRequest.booking_payment_id);
      const { data, error } = await adminSupabase
        .from('booking_payments')
        .select('*')
        .eq('id', supportRequest.booking_payment_id)
        .single();
      
      if (!error && data) {
        bookingPayment = data;
      }
    }
    
    // If no booking payment found via booking_payment_id, try via appointment_id
    if (!bookingPayment && supportRequest.appointment_id) {
      console.log('[REFUND] Trying to find payment via appointment_id:', supportRequest.appointment_id);
      
      const { data, error } = await adminSupabase
        .from('appointments')
        .select(`
          booking_id,
          bookings!inner(
            booking_payments(*)
          )
        `)
        .eq('id', supportRequest.appointment_id)
        .single();
      
      if (!error && data) {
        const bookingData = data.bookings as unknown as { 
          booking_payments?: Array<{
            id: string;
            deposit_payment_intent_id?: string | null;
            stripe_payment_intent_id?: string | null;
            deposit_amount?: number | null;
            balance_amount?: number | null;
            amount?: number | null;
            status?: string | null;
          }>
        };
        if (bookingData?.booking_payments && bookingData.booking_payments.length > 0) {
          const payment = bookingData.booking_payments[0];
          if (payment) {
            bookingPayment = payment;
            console.log('[REFUND] Found payment via appointment_id:', bookingPayment.id);
          }
        }
      }
    }
    
    // If still no booking payment found, try via booking_id
    if (!bookingPayment && supportRequest.booking_id) {
      console.log('[REFUND] Trying to find payment via booking_id:', supportRequest.booking_id);
      
      const { data, error } = await adminSupabase
        .from('booking_payments')
        .select('*')
        .eq('booking_id', supportRequest.booking_id)
        .single();
      
      if (!error && data) {
        bookingPayment = data;
        console.log('[REFUND] Found payment via booking_id:', bookingPayment.id);
      }
    }
    
    if (!bookingPayment) {
      console.error('[REFUND] No booking payment found for support request');
      return {
        success: false,
        error: 'No payment information found for this support request',
      };
    }

    // Get any tips for this booking that need to be included in refund calculations
    let bookingTips: Array<{
      id: string;
      amount: number;
      stripe_payment_intent_id?: string | null;
      status: string;
      refunded_amount: number;
    }> = [];
    
    // First, get the booking_id from the booking_payment
    const { data: booking, error: bookingError } = await adminSupabase
      .from('booking_payments')
      .select('booking_id')
      .eq('id', bookingPayment.id)
      .single();
      
    if (!bookingError && booking) {
      const { data: tips, error: tipsError } = await adminSupabase
        .from('tips')
        .select('id, amount, stripe_payment_intent_id, status, refunded_amount')
        .eq('booking_id', booking.booking_id)
        .eq('status', 'completed');
        
      if (!tipsError && tips) {
        bookingTips = tips;
        console.log(`[REFUND] Found ${bookingTips.length} completed tips for booking, total: $${bookingTips.reduce((sum, tip) => sum + tip.amount, 0)}`);
      }
    }

    console.log('[REFUND] Payment details:', {
      deposit_payment_intent_id: bookingPayment.deposit_payment_intent_id,
      stripe_payment_intent_id: bookingPayment.stripe_payment_intent_id,
      status: bookingPayment.status,
      deposit_amount: bookingPayment.deposit_amount,
      balance_amount: bookingPayment.balance_amount,
      amount: bookingPayment.amount
    });

    const refundAmountCents = Math.round(refundAmount * 100);
    const depositAmountCents = Math.round((bookingPayment.deposit_amount || 0) * 100);
    const balanceAmountCents = Math.round((bookingPayment.balance_amount || 0) * 100);
    
    let totalRefundedCents = 0;
    const refundIds: string[] = [];

    // STEP 1: Handle balance payment first (if exists and refund amount requires it)
    if (bookingPayment.stripe_payment_intent_id && balanceAmountCents > 0) {
      const balancePaymentIntentId = bookingPayment.stripe_payment_intent_id;
      
      // Retrieve the balance payment intent to check its status
      const balancePaymentIntent = await stripe.paymentIntents.retrieve(balancePaymentIntentId);
      console.log('[REFUND] Balance payment intent status:', balancePaymentIntent.status);
      
      // Determine how much to refund/capture from balance
      const balanceRefundAmount = Math.min(refundAmountCents, balanceAmountCents);
      
      if (balancePaymentIntent.status === 'requires_capture') {
        // Balance payment is uncaptured - do partial capture
        console.log(`[REFUND] Balance payment is uncaptured. Will cancel or partially capture.`);
        
        if (balanceRefundAmount < balanceAmountCents) {
          // Partial capture: capture what's not being refunded
          const captureAmount = balanceAmountCents - balanceRefundAmount;
          console.log(`[REFUND] Partially capturing balance payment: $${captureAmount/100} (not refunding $${balanceRefundAmount/100})`);
          
          try {
            await stripe.paymentIntents.capture(balancePaymentIntentId, {
              amount_to_capture: captureAmount
            });
            console.log(`[REFUND] Successfully captured $${captureAmount/100} from balance payment`);
          } catch (captureError) {
            console.error('[REFUND] Error capturing partial balance payment:', captureError);
            return {
              success: false,
              error: 'Failed to process partial capture of balance payment'
            };
          }
        } else {
          // Full balance refund - cancel the uncaptured payment
          console.log(`[REFUND] Canceling uncaptured balance payment (full balance refund)`);
          
          try {
            await stripe.paymentIntents.cancel(balancePaymentIntentId);
            console.log(`[REFUND] Successfully canceled uncaptured balance payment`);
          } catch (cancelError) {
            console.error('[REFUND] Error canceling balance payment:', cancelError);
            return {
              success: false,
              error: 'Failed to cancel uncaptured balance payment'
            };
          }
        }
        
        totalRefundedCents += balanceRefundAmount;
        
      } else if (balancePaymentIntent.status === 'succeeded') {
        // Balance payment is captured - create refund
        console.log(`[REFUND] Balance payment is captured. Creating refund for $${balanceRefundAmount/100}`);
        
        try {
          const balanceRefund = await stripe.refunds.create({
            payment_intent: balancePaymentIntentId,
            amount: balanceRefundAmount,
            metadata: {
              support_request_id: supportRequestId,
              refund_type: 'balance'
            }
          });
          
          refundIds.push(balanceRefund.id);
          totalRefundedCents += balanceRefundAmount;
          console.log(`[REFUND] Balance refund created: ${balanceRefund.id}, amount: $${balanceRefundAmount/100}`);
        } catch (refundError) {
          console.error('[REFUND] Error creating balance refund:', refundError);
          return {
            success: false,
            error: 'Failed to create balance payment refund'
          };
        }
      }
    }

    // STEP 2: Handle deposit refund (if needed and exists)
    const remainingRefundCents = refundAmountCents - totalRefundedCents;
    
    if (remainingRefundCents > 0 && bookingPayment.deposit_payment_intent_id && depositAmountCents > 0) {
      const depositPaymentIntentId = bookingPayment.deposit_payment_intent_id;
      const depositRefundAmount = Math.min(remainingRefundCents, depositAmountCents);
      
      console.log(`[REFUND] Creating deposit refund for $${depositRefundAmount/100}`);
      
      try {
        const depositRefund = await stripe.refunds.create({
          payment_intent: depositPaymentIntentId,
          amount: depositRefundAmount,
          metadata: {
            support_request_id: supportRequestId,
            refund_type: 'deposit'
          }
        });
        
        refundIds.push(depositRefund.id);
        totalRefundedCents += depositRefundAmount;
        console.log(`[REFUND] Deposit refund created: ${depositRefund.id}, amount: $${depositRefundAmount/100}`);
      } catch (refundError) {
        console.error('[REFUND] Error creating deposit refund:', refundError);
        return {
          success: false,
          error: 'Failed to create deposit payment refund'
        };
      }
    }

    // STEP 3: Handle tips refund (if needed and any tips exist)
    let remainingRefundCentsAfterMain = refundAmountCents - totalRefundedCents;
    
    if (remainingRefundCentsAfterMain > 0 && bookingTips.length > 0) {
      console.log(`[REFUND] Processing tips refund for remaining amount: $${remainingRefundCentsAfterMain/100}`);
      
      for (const tip of bookingTips) {
        if (remainingRefundCentsAfterMain <= 0) break;
        
        const tipAmountCents = Math.round(tip.amount * 100);
        const tipRefundedAmountCents = Math.round(tip.refunded_amount * 100);
        const tipRefundableAmountCents = tipAmountCents - tipRefundedAmountCents;
        
        if (tipRefundableAmountCents <= 0) {
          console.log(`[REFUND] Tip ${tip.id} already fully refunded, skipping`);
          continue;
        }
        
        const tipRefundAmount = Math.min(remainingRefundCentsAfterMain, tipRefundableAmountCents);
        
        if (tip.stripe_payment_intent_id) {
          console.log(`[REFUND] Creating tip refund for $${tipRefundAmount/100}`);
          
          try {
            const tipRefund = await stripe.refunds.create({
              payment_intent: tip.stripe_payment_intent_id,
              amount: tipRefundAmount,
              metadata: {
                support_request_id: supportRequestId,
                refund_type: 'tip',
                tip_id: tip.id
              }
            });
            
            refundIds.push(tipRefund.id);
            totalRefundedCents += tipRefundAmount;
            remainingRefundCentsAfterMain -= tipRefundAmount;
            
            // Update tip refunded amount
            const { error: tipUpdateError } = await adminSupabase
              .from('tips')
              .update({
                refunded_amount: (tipRefundedAmountCents + tipRefundAmount) / 100,
                refunded_at: new Date().toISOString(),
                stripe_refund_id: tipRefund.id
              })
              .eq('id', tip.id);
              
            if (tipUpdateError) {
              console.error('[REFUND] Error updating tip refund status:', tipUpdateError);
            }
            
            console.log(`[REFUND] Tip refund created: ${tipRefund.id}, amount: $${tipRefundAmount/100}`);
          } catch (refundError) {
            console.error('[REFUND] Error creating tip refund:', refundError);
            return {
              success: false,
              error: 'Failed to create tip refund'
            };
          }
        }
      }
    }

    // Verify total refunded amount
    if (totalRefundedCents < refundAmountCents) {
      console.error(`[REFUND] Refund incomplete: requested $${refundAmountCents/100}, processed $${totalRefundedCents/100}`);
      return {
        success: false,
        error: `Could not process full refund amount. Processed: $${totalRefundedCents/100}, Requested: $${refundAmountCents/100}`
      };
    }

    // Update support request with refund information
    const primaryRefundId = refundIds[0] || null;
    console.log(`[REFUND] Updating support request with refund IDs: ${refundIds.join(', ')}`);
    
    // For partial captures (no refund IDs), we should still resolve the support request
    // Find the professional or admin to mark as resolver
    let resolvedBy: string | null = null;
    if (totalRefundedCents > 0) {
      // Get the support request to find the professional
      const { data: supportRequest } = await adminSupabase
        .from('support_requests')
        .select('professional_id')
        .eq('id', supportRequestId)
        .single();
        
      if (supportRequest?.professional_id) {
        resolvedBy = supportRequest.professional_id;
      } else {
        // Fallback to admin user
        const { data: adminUser } = await adminSupabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();
        resolvedBy = adminUser?.user_id || null;
      }
    }

    const updateData: {
      stripe_refund_id: string | null;
      refund_amount: number;
      processed_at: string;
      status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
      resolved_at?: string;
      resolved_by?: string;
      resolution_notes?: string;
    } = {
      stripe_refund_id: primaryRefundId,
      refund_amount: totalRefundedCents / 100,
      processed_at: new Date().toISOString()
    };

    // If we successfully processed any refund (even via partial capture), mark as resolved
    if (totalRefundedCents > 0 && resolvedBy) {
      updateData.status = 'resolved';
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = resolvedBy;
      updateData.resolution_notes = primaryRefundId 
        ? 'Resolved via Stripe refund' 
        : 'Resolved via partial payment capture';
    }

    const { error: updateError } = await adminSupabase
      .from('support_requests')
      .update(updateData)
      .eq('id', supportRequestId);
      
    if (updateError) {
      console.error('[REFUND] Error updating support request:', updateError);
    }
    
    // Update booking payment status
    const { error: paymentUpdateError } = await adminSupabase
      .from('booking_payments')
      .update({
        status: totalRefundedCents >= (depositAmountCents + balanceAmountCents) ? 'refunded' : 'partially_refunded',
        refunded_amount: totalRefundedCents / 100,
        refund_reason: 'Support request refund',
        refunded_at: new Date().toISOString(),
        refund_transaction_id: refundIds.join(','), // Store all refund IDs
      })
      .eq('id', bookingPayment.id);
      
    if (paymentUpdateError) {
      console.error('[REFUND] Error updating booking payment:', paymentUpdateError);
    }
    
    console.log(`[REFUND] Process completed successfully. Total refunded: $${totalRefundedCents/100}`);
    
    if (primaryRefundId) {
      return {
        success: true,
        refundId: primaryRefundId,
      };
    }
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('[REFUND] Error processing refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get the status of a Stripe refund
 * @param refundId The ID of the refund to check
 * @returns The refund status and amount
 */
export async function getStripeRefundStatus(refundId: string): Promise<{ 
  status?: string; 
  amount?: number;
  error?: string;
}> {
  try {
    const refund = await stripe.refunds.retrieve(refundId);
    
    const result: { status?: string; amount?: number } = {};
    
    if (refund.status) {
      result.status = refund.status;
    }
    
    if (refund.amount !== undefined) {
      result.amount = refund.amount;
    }
    
    return result;
  } catch (error) {
    console.error('Error retrieving refund status:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle Stripe refund webhook events
 * @param refund The refund object from Stripe
 * @returns Success status
 */
export async function handleStripeRefundWebhook(refund: Stripe.Refund): Promise<{ success: boolean; error?: string }> {
  console.log(`[WEBHOOK] Processing refund webhook event for refund ID: ${refund.id}, status: ${refund.status}`);
  console.log(`[WEBHOOK] Refund metadata:`, JSON.stringify(refund.metadata || {}));
  
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Get the support request ID from the refund metadata
    const supportRequestId = refund.metadata?.support_request_id;
    const paymentIntentId = refund.payment_intent as string;
    
    // First try to find support request by ID from metadata
    if (supportRequestId) {
      console.log(`[WEBHOOK] Found support request ID in metadata: ${supportRequestId}`);
      
      // Get the support request
      const { data: supportRequest, error: supportRequestError } = await supabase
        .from('support_requests')
        .select('*')
        .eq('id', supportRequestId)
        .single();
        
      if (!supportRequestError && supportRequest) {
        return await updateSupportRequestWithRefund(adminSupabase as SupabaseClient<Database>, supportRequest, refund);
      } else {
        console.log('[WEBHOOK] Support request not found by ID, trying to find by payment intent');
      }
    } else {
      console.log('[WEBHOOK] No support request ID in refund metadata, trying to find by payment intent');
    }
    
    // If we couldn't find by ID or no ID was provided, try to find by payment intent
    if (paymentIntentId) {
      console.log(`[WEBHOOK] Searching for support request by payment intent: ${paymentIntentId}`);
      
      // Find booking payment by payment intent (could be deposit or balance)
      const { data: bookingPayment } = await adminSupabase
        .from('booking_payments')
        .select('*, bookings!inner(support_requests(*))')
        .or(`stripe_payment_intent_id.eq.${paymentIntentId},deposit_payment_intent_id.eq.${paymentIntentId}`)
        .single();
        
      if (bookingPayment) {
        const bookingData = bookingPayment.bookings as unknown as { 
          support_requests?: Array<{ id: string; appointment_id?: string | null; professional_id?: string | null }> 
        };
        const supportRequests = bookingData?.support_requests;
        if (supportRequests && supportRequests.length > 0) {
          const supportRequest = supportRequests[0];
          if (supportRequest) {
            return await updateSupportRequestWithRefund(adminSupabase as SupabaseClient<Database>, supportRequest, refund);
          }
        }
      }
    }
    
    console.log('[WEBHOOK] Could not find associated support request for refund');
    return { success: false, error: 'Support request not found' };
    
  } catch (error) {
    console.error('[WEBHOOK] Error handling refund webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update support request with refund information from webhook
 */
async function updateSupportRequestWithRefund(
  supabase: SupabaseClient<Database>,
  supportRequest: { id: string; appointment_id?: string | null; professional_id?: string | null },
  refund: Stripe.Refund
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[WEBHOOK] Updating support request ${supportRequest.id} with refund status: ${refund.status}`);
    
    // Check if this is a tip refund and handle separately
    if (refund.metadata?.refund_type === 'tip' && refund.metadata?.tip_id) {
      console.log(`[WEBHOOK] Processing tip refund for tip ID: ${refund.metadata.tip_id}`);
      
      // Update the tip record
      const { error: tipUpdateError } = await supabase
        .from('tips')
        .update({
          refunded_amount: refund.amount / 100,
          refunded_at: new Date().toISOString(),
          stripe_refund_id: refund.id,
          status: refund.status === 'succeeded' ? 'refunded' : 'completed'
        })
        .eq('id', refund.metadata.tip_id);
        
      if (tipUpdateError) {
        console.error('[WEBHOOK] Error updating tip refund status:', tipUpdateError);
        return { success: false, error: tipUpdateError.message };
      }
      
      console.log('[WEBHOOK] Tip refund processed successfully');
      return { success: true };
    }
    
    // Update the support request
    const updateData: {
      stripe_refund_id: string;
      status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
      resolved_at?: string;
      resolved_by?: string;
      resolution_notes?: string;
    } = {
      stripe_refund_id: refund.id,
    };
    
    if (refund.status === 'succeeded') {
      // When resolving, we need to provide resolved_by and resolved_at to satisfy the constraint
      updateData.status = 'resolved';
      updateData.resolved_at = new Date().toISOString();
      updateData.resolution_notes = 'Automatically resolved via successful Stripe refund';
      
      // Try to use the professional from the support request, or find an admin user
      if (supportRequest.professional_id) {
        updateData.resolved_by = supportRequest.professional_id;
      } else {
        // Find any admin user as fallback for system resolution
        const { data: adminUser } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();
          
        if (adminUser) {
          updateData.resolved_by = adminUser.user_id;
        } else {
          // If no admin found, we cannot proceed with resolved status due to constraint
          console.log('[WEBHOOK] No admin user found, keeping status as in_progress');
          updateData.status = 'in_progress';
          delete updateData.resolved_at;
          delete updateData.resolution_notes;
        }
      }
    } else {
      updateData.status = 'in_progress';
    }
    
    const { error: updateError } = await supabase
      .from('support_requests')
      .update(updateData)
      .eq('id', supportRequest.id);
      
    if (updateError) {
      console.error('[WEBHOOK] Error updating support request:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Email notifications are handled by the refund action, not the webhook
    // The webhook just updates the support request status
    console.log('[WEBHOOK] Refund webhook processed successfully');
    
    return { success: true };
  } catch (error) {
    console.error('[WEBHOOK] Error in updateSupportRequestWithRefund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}