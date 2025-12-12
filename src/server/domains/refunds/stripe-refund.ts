import Stripe from 'stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Type definitions for refund processing
 */
type RefundOperation = {
  type: 'refund' | 'cancel' | 'partial_capture';
  paymentIntentId: string;
  amount: number;
  refundType: 'balance' | 'deposit' | 'service_fee' | 'tip';
  metadata: Record<string, string>;
};

type RefundResult = {
  success: boolean;
  refundId?: string;
  operation: RefundOperation;
  error?: string;
};

type PaymentIntentInfo = {
  id: string;
  amount: number;
  status: string;
  availableForRefund: number;
};

/**
 * Verify that all refunds were successfully created in Stripe
 * @param refundIds Array of Stripe refund IDs to verify
 * @returns True if all refunds are in valid state
 */
async function verifyRefundCompletion(
  refundIds: string[],
): Promise<{ success: boolean; error?: string }> {
  console.log(`[REFUND] Verifying ${refundIds.length} refund(s)...`);

  try {
    for (const refundId of refundIds) {
      const refund = await stripe.refunds.retrieve(refundId);

      // Refunds can be: succeeded, pending, failed, canceled
      // We accept succeeded and pending as valid states
      if (refund.status !== 'succeeded' && refund.status !== 'pending') {
        console.error(
          `[REFUND] Refund ${refundId} has invalid status: ${refund.status}`,
        );
        return {
          success: false,
          error: `Refund ${refundId} failed with status: ${refund.status}`,
        };
      }

      console.log(`[REFUND] Refund ${refundId} verified: ${refund.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[REFUND] Error verifying refunds:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Retrieve and validate payment intent information from Stripe
 * @param paymentIntentId Stripe payment intent ID
 * @returns Payment intent information including available refund amount
 */
async function getPaymentIntentInfo(
  paymentIntentId: string,
): Promise<PaymentIntentInfo | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    let availableForRefund = 0;

    if (paymentIntent.status === 'succeeded') {
      // For succeeded payments, calculate available amount as total minus already refunded
      const totalAmount = paymentIntent.amount;
      const refundedAmount =
        (paymentIntent as { amount_refunded?: number }).amount_refunded || 0;
      availableForRefund = totalAmount - refundedAmount;
    } else if (paymentIntent.status === 'requires_capture') {
      // For uncaptured payments, the full amount is available to cancel/partial capture
      availableForRefund =
        paymentIntent.amount_capturable || paymentIntent.amount;
    }

    console.log(
      `[REFUND] Payment Intent ${paymentIntentId}: status=${paymentIntent.status}, total=$${paymentIntent.amount / 100}, available=$${availableForRefund / 100}`,
    );

    return {
      id: paymentIntentId,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      availableForRefund,
    };
  } catch (error) {
    console.error(
      `[REFUND] Error retrieving payment intent ${paymentIntentId}:`,
      error,
    );
    return null;
  }
}

/**
 * Calculate optimal refund distribution across available payment sources
 * Returns a plan for executing refunds without making any Stripe API calls
 */
async function calculateRefundDistribution(
  refundAmountCents: number,
  bookingPayment: {
    deposit_payment_intent_id?: string | null;
    stripe_payment_intent_id?: string | null;
    deposit_amount: number;
    balance_amount: number;
    service_fee: number;
  },
  isCashPayment: boolean,
  bookingTips: Array<{
    id: string;
    amount: number;
    stripe_payment_intent_id?: string | null;
    refunded_amount: number;
  }>,
  supportRequestId: string,
): Promise<{
  success: boolean;
  operations: RefundOperation[];
  error?: string;
}> {
  console.log('[REFUND] === PHASE 1: CALCULATING REFUND DISTRIBUTION ===');
  console.log(`[REFUND] Requested refund: $${refundAmountCents / 100}`);
  console.log(`[REFUND] Cash payment: ${isCashPayment}`);

  const operations: RefundOperation[] = [];
  let remainingToRefund = refundAmountCents;

  const depositAmountCents = Math.round(bookingPayment.deposit_amount * 100);
  const balanceAmountCents = Math.round(bookingPayment.balance_amount * 100);
  const serviceFeeAmountCents = Math.round(bookingPayment.service_fee * 100);

  // STEP 1: Validate payment intent availability
  const paymentIntents: Map<string, PaymentIntentInfo> = new Map();

  // Check balance payment intent (if exists and not cash payment)
  if (
    bookingPayment.stripe_payment_intent_id &&
    balanceAmountCents > 0 &&
    !isCashPayment
  ) {
    const info = await getPaymentIntentInfo(
      bookingPayment.stripe_payment_intent_id,
    );
    if (info) {
      paymentIntents.set(bookingPayment.stripe_payment_intent_id, info);
    } else {
      return {
        success: false,
        operations: [],
        error: 'Failed to retrieve balance payment intent information',
      };
    }
  }

  // Check deposit payment intent (if exists)
  if (bookingPayment.deposit_payment_intent_id && depositAmountCents > 0) {
    const info = await getPaymentIntentInfo(
      bookingPayment.deposit_payment_intent_id,
    );
    if (info) {
      paymentIntents.set(bookingPayment.deposit_payment_intent_id, info);
    } else {
      return {
        success: false,
        operations: [],
        error: 'Failed to retrieve deposit payment intent information',
      };
    }
  }

  // STEP 2: Calculate maximum refundable amount
  const maxRefundableAmountCents = isCashPayment
    ? depositAmountCents + serviceFeeAmountCents
    : depositAmountCents + balanceAmountCents;

  console.log(
    `[REFUND] Maximum refundable: $${maxRefundableAmountCents / 100} (${isCashPayment ? 'cash: deposit+service fee' : 'card: deposit+balance'})`,
  );

  if (refundAmountCents > maxRefundableAmountCents) {
    return {
      success: false,
      operations: [],
      error: `Refund amount $${refundAmountCents / 100} exceeds maximum refundable $${maxRefundableAmountCents / 100}`,
    };
  }

  // STEP 3: Plan balance refund (if applicable)
  if (
    bookingPayment.stripe_payment_intent_id &&
    balanceAmountCents > 0 &&
    !isCashPayment &&
    remainingToRefund > 0
  ) {
    const balanceInfo = paymentIntents.get(
      bookingPayment.stripe_payment_intent_id,
    );
    if (balanceInfo) {
      const balanceRefundAmount = Math.min(
        remainingToRefund,
        balanceInfo.availableForRefund,
      );

      if (balanceRefundAmount > 0) {
        if (balanceInfo.status === 'requires_capture') {
          // Uncaptured payment: cancel or partial capture
          if (balanceRefundAmount === balanceInfo.amount) {
            operations.push({
              type: 'cancel',
              paymentIntentId: balanceInfo.id,
              amount: balanceRefundAmount,
              refundType: 'balance',
              metadata: {
                support_request_id: supportRequestId,
                refund_type: 'balance',
              },
            });
          } else {
            // Partial capture: capture what's NOT being refunded
            const captureAmount = balanceInfo.amount - balanceRefundAmount;
            operations.push({
              type: 'partial_capture',
              paymentIntentId: balanceInfo.id,
              amount: captureAmount,
              refundType: 'balance',
              metadata: {
                support_request_id: supportRequestId,
                refund_type: 'balance_partial_capture',
                refunded_amount: balanceRefundAmount.toString(),
              },
            });
          }
        } else if (balanceInfo.status === 'succeeded') {
          // Captured payment: create refund
          operations.push({
            type: 'refund',
            paymentIntentId: balanceInfo.id,
            amount: balanceRefundAmount,
            refundType: 'balance',
            metadata: {
              support_request_id: supportRequestId,
              refund_type: 'balance',
            },
          });
        }

        remainingToRefund -= balanceRefundAmount;
        console.log(
          `[REFUND] Planned balance ${operations[operations.length - 1]?.type}: $${balanceRefundAmount / 100}, remaining: $${remainingToRefund / 100}`,
        );
      }
    }
  }

  // STEP 4: Plan deposit refund (if needed)
  if (
    remainingToRefund > 0 &&
    bookingPayment.deposit_payment_intent_id &&
    depositAmountCents > 0
  ) {
    const depositInfo = paymentIntents.get(
      bookingPayment.deposit_payment_intent_id,
    );
    if (depositInfo) {
      const depositRefundAmount = Math.min(
        remainingToRefund,
        depositInfo.availableForRefund,
      );

      if (depositRefundAmount > 0) {
        if (depositInfo.status === 'succeeded') {
          operations.push({
            type: 'refund',
            paymentIntentId: depositInfo.id,
            amount: depositRefundAmount,
            refundType: 'deposit',
            metadata: {
              support_request_id: supportRequestId,
              refund_type: isCashPayment ? 'deposit_cash' : 'deposit',
            },
          });

          remainingToRefund -= depositRefundAmount;
          console.log(
            `[REFUND] Planned deposit refund: $${depositRefundAmount / 100}, remaining: $${remainingToRefund / 100}`,
          );
        }
      }
    }
  }

  // STEP 5: Plan tip refunds (if needed and not cash payment)
  if (remainingToRefund > 0 && bookingTips.length > 0 && !isCashPayment) {
    for (const tip of bookingTips) {
      if (remainingToRefund <= 0) break;

      const tipAmountCents = Math.round(tip.amount * 100);
      const tipRefundedCents = Math.round(tip.refunded_amount * 100);
      const tipAvailable = tipAmountCents - tipRefundedCents;

      if (tipAvailable > 0 && tip.stripe_payment_intent_id) {
        const tipRefundAmount = Math.min(remainingToRefund, tipAvailable);

        operations.push({
          type: 'refund',
          paymentIntentId: tip.stripe_payment_intent_id,
          amount: tipRefundAmount,
          refundType: 'tip',
          metadata: {
            support_request_id: supportRequestId,
            refund_type: 'tip',
            tip_id: tip.id,
          },
        });

        remainingToRefund -= tipRefundAmount;
        console.log(
          `[REFUND] Planned tip refund: $${tipRefundAmount / 100}, remaining: $${remainingToRefund / 100}`,
        );
      }
    }
  }

  // STEP 6: Validate we can refund the full amount
  if (remainingToRefund > 0) {
    return {
      success: false,
      operations: [],
      error: `Cannot refund full amount. Missing $${remainingToRefund / 100}. Check payment intent availability.`,
    };
  }

  console.log(
    `[REFUND] ✅ Refund distribution calculated: ${operations.length} operation(s)`,
  );
  operations.forEach((op, i) => {
    console.log(
      `[REFUND]   ${i + 1}. ${op.type.toUpperCase()} $${op.amount / 100} from ${op.refundType} (${op.paymentIntentId})`,
    );
  });

  return { success: true, operations };
}

/**
 * Execute planned refund operations in Stripe
 * This function attempts all operations and rolls back on failure
 */
async function executeRefundOperations(operations: RefundOperation[]): Promise<{
  success: boolean;
  results: RefundResult[];
  error?: string;
}> {
  console.log('[REFUND] === PHASE 2: EXECUTING STRIPE OPERATIONS ===');

  const results: RefundResult[] = [];
  const successfulRefunds: string[] = [];

  try {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op) continue; // Skip if operation is undefined

      console.log(
        `[REFUND] Executing operation ${i + 1}/${operations.length}: ${op.type} $${op.amount / 100}`,
      );

      try {
        if (op.type === 'refund') {
          // Create a refund
          const refund = await stripe.refunds.create({
            payment_intent: op.paymentIntentId,
            amount: op.amount,
            reverse_transfer: true,
            metadata: op.metadata,
          });

          console.log(
            `[REFUND] ✅ Refund created: ${refund.id}, status: ${refund.status}`,
          );

          results.push({
            success: true,
            refundId: refund.id,
            operation: op,
          });
          successfulRefunds.push(refund.id);
        } else if (op.type === 'cancel') {
          // Cancel an uncaptured payment intent
          await stripe.paymentIntents.cancel(op.paymentIntentId);

          console.log(
            `[REFUND] ✅ Payment intent canceled: ${op.paymentIntentId}`,
          );

          results.push({
            success: true,
            operation: op,
          });
        } else if (op.type === 'partial_capture') {
          // Partially capture a payment intent
          await stripe.paymentIntents.capture(op.paymentIntentId, {
            amount_to_capture: op.amount,
          });

          console.log(
            `[REFUND] ✅ Partial capture: ${op.paymentIntentId}, captured: $${op.amount / 100}`,
          );

          results.push({
            success: true,
            operation: op,
          });
        }
      } catch (operationError) {
        console.error(`[REFUND] ❌ Operation ${i + 1} failed:`, operationError);

        results.push({
          success: false,
          operation: op,
          error:
            operationError instanceof Error
              ? operationError.message
              : 'Operation failed',
        });

        // CRITICAL: If any operation fails, we need to rollback previous successful refunds
        console.error(
          `[REFUND] ❌ ROLLING BACK ${successfulRefunds.length} successful refund(s)`,
        );

        for (const refundId of successfulRefunds) {
          try {
            // Note: Stripe refunds cannot be canceled once created
            // We log this for manual intervention
            console.error(
              `[REFUND] ⚠️ Manual intervention required: Refund ${refundId} was created but subsequent operations failed`,
            );
          } catch (rollbackError) {
            console.error(
              `[REFUND] ❌ Rollback failed for ${refundId}:`,
              rollbackError,
            );
          }
        }

        return {
          success: false,
          results,
          error: `Operation ${i + 1} failed. ${successfulRefunds.length} refund(s) may need manual review.`,
        };
      }
    }

    // Verify all refunds succeeded
    if (successfulRefunds.length > 0) {
      console.log(
        `[REFUND] Verifying ${successfulRefunds.length} refund(s)...`,
      );
      const verification = await verifyRefundCompletion(successfulRefunds);

      if (!verification.success) {
        return {
          success: false,
          results,
          error: verification.error || 'Refund verification failed',
        };
      }
    }

    console.log(`[REFUND] ✅ All ${operations.length} operation(s) completed`);
    return { success: true, results };
  } catch (error) {
    console.error('[REFUND] ❌ Unexpected error during execution:', error);
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Execution failed',
    };
  }
}

/**
 * Update database with successful refund information
 * This should ONLY be called after all Stripe operations succeed
 */
async function updateDatabaseAfterRefund(
  adminSupabase: SupabaseClient<Database>,
  supportRequestId: string,
  bookingPaymentId: string,
  results: RefundResult[],
  totalRefundedCents: number,
  depositAmountCents: number,
  balanceAmountCents: number,
): Promise<{ success: boolean; error?: string }> {
  console.log('[REFUND] === PHASE 3: UPDATING DATABASE ===');

  try {
    // Collect all refund IDs
    const refundIds = results
      .filter((r) => r.success && r.refundId)
      .map((r) => r.refundId!);

    const primaryRefundId = refundIds[0] || null;

    console.log(
      `[REFUND] Updating database with ${refundIds.length} refund ID(s)`,
    );

    // Find resolver (professional or admin)
    let resolvedBy: string | null = null;
    const { data: supportRequest } = await adminSupabase
      .from('support_requests')
      .select('professional_id')
      .eq('id', supportRequestId)
      .single();

    if (supportRequest?.professional_id) {
      resolvedBy = supportRequest.professional_id;
    } else {
      const { data: adminUser } = await adminSupabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      resolvedBy = adminUser?.user_id || null;
    }

    // Update support request
    const supportRequestUpdate: {
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
      processed_at: new Date().toISOString(),
    };

    if (totalRefundedCents > 0 && resolvedBy) {
      supportRequestUpdate.status = 'resolved';
      supportRequestUpdate.resolved_at = new Date().toISOString();
      supportRequestUpdate.resolved_by = resolvedBy;
      supportRequestUpdate.resolution_notes = primaryRefundId
        ? 'Resolved via successful Stripe refund'
        : 'Resolved via payment capture adjustment';
    }

    const { error: supportRequestError } = await adminSupabase
      .from('support_requests')
      .update(supportRequestUpdate)
      .eq('id', supportRequestId);

    if (supportRequestError) {
      console.error(
        '[REFUND] ❌ Failed to update support request:',
        supportRequestError,
      );
      return {
        success: false,
        error: `Database update failed: ${supportRequestError.message}`,
      };
    }

    console.log('[REFUND] ✅ Support request updated');

    // Update booking payment
    const paymentStatus =
      totalRefundedCents >= depositAmountCents + balanceAmountCents
        ? 'refunded'
        : 'partially_refunded';

    const { error: paymentError } = await adminSupabase
      .from('booking_payments')
      .update({
        status: paymentStatus,
        refunded_amount: totalRefundedCents / 100,
        refund_reason: 'Support request refund',
        refunded_at: new Date().toISOString(),
        refund_transaction_id: refundIds.join(','),
      })
      .eq('id', bookingPaymentId);

    if (paymentError) {
      console.error(
        '[REFUND] ❌ Failed to update booking payment:',
        paymentError,
      );
      return {
        success: false,
        error: `Database update failed: ${paymentError.message}`,
      };
    }

    console.log('[REFUND] ✅ Booking payment updated');

    // Update tips if any were refunded
    for (const result of results) {
      if (
        result.success &&
        result.operation.refundType === 'tip' &&
        result.operation.metadata.tip_id &&
        result.refundId
      ) {
        const { error: tipError } = await adminSupabase
          .from('tips')
          .update({
            refunded_amount: result.operation.amount / 100,
            refunded_at: new Date().toISOString(),
            stripe_refund_id: result.refundId,
          })
          .eq('id', result.operation.metadata.tip_id);

        if (tipError) {
          console.error('[REFUND] ⚠️ Failed to update tip:', tipError);
          // Don't fail the entire operation for tip update errors
        } else {
          console.log(
            `[REFUND] ✅ Tip ${result.operation.metadata.tip_id} updated`,
          );
        }
      }
    }

    console.log('[REFUND] ✅ Database updates completed');
    return { success: true };
  } catch (error) {
    console.error('[REFUND] ❌ Database update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed',
    };
  }
}

/**
 * Process a refund through Stripe for a support request
 * Handles both deposit and balance payments correctly with proper transactional guarantees
 * @param supportRequestId The ID of the support request
 * @param refundAmount The amount to refund (in dollars)
 * @returns Success status and error message if applicable
 */
export async function processStripeRefund(
  supportRequestId: string,
  refundAmount: number,
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  console.log(`[REFUND] ====================================================`);
  console.log(`[REFUND] STARTING REFUND PROCESS`);
  console.log(`[REFUND] Support Request: ${supportRequestId}`);
  console.log(`[REFUND] Amount: $${refundAmount}`);
  console.log(`[REFUND] ====================================================`);

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // =================================================================
    // VALIDATION PHASE: Fetch and validate all required data
    // =================================================================

    // Get the support request
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', supportRequestId)
      .single();

    if (supportRequestError || !supportRequest) {
      console.error(
        '[REFUND] Error fetching support request:',
        supportRequestError,
      );
      return {
        success: false,
        error: 'Support request not found',
      };
    }

    // Get booking payment details
    let bookingPayment: {
      id: string;
      deposit_payment_intent_id?: string | null;
      stripe_payment_intent_id?: string | null;
      deposit_amount?: number | null;
      balance_amount?: number | null;
      amount?: number | null;
      status?: string | null;
      service_fee?: number | null;
    } | null = null;

    // Try finding payment by various relationships
    if (supportRequest.booking_payment_id) {
      const { data } = await adminSupabase
        .from('booking_payments')
        .select('*')
        .eq('id', supportRequest.booking_payment_id)
        .single();
      if (data) bookingPayment = data;
    }

    if (!bookingPayment && supportRequest.appointment_id) {
      const { data } = await adminSupabase
        .from('appointments')
        .select('booking_id, bookings!inner(booking_payments(*))')
        .eq('id', supportRequest.appointment_id)
        .single();

      if (data) {
        const bookingData = data.bookings as unknown as {
          booking_payments?: Array<{
            id: string;
            deposit_payment_intent_id?: string | null;
            stripe_payment_intent_id?: string | null;
            deposit_amount?: number | null;
            balance_amount?: number | null;
            amount?: number | null;
            status?: string | null;
            service_fee?: number | null;
          }>;
        };
        if (bookingData?.booking_payments?.[0]) {
          bookingPayment = bookingData.booking_payments[0];
        }
      }
    }

    if (!bookingPayment && supportRequest.booking_id) {
      const { data } = await adminSupabase
        .from('booking_payments')
        .select('*')
        .eq('booking_id', supportRequest.booking_id)
        .single();
      if (data) bookingPayment = data;
    }

    if (!bookingPayment) {
      console.error('[REFUND] No booking payment found');
      return {
        success: false,
        error: 'No payment information found for this support request',
      };
    }

    // Get payment method details
    const { data: paymentMethodData, error: paymentMethodError } =
      await adminSupabase
        .from('booking_payments')
        .select('payment_methods(name, is_online)')
        .eq('id', bookingPayment.id)
        .single();

    if (paymentMethodError || !paymentMethodData) {
      console.error(
        '[REFUND] Error fetching payment method:',
        paymentMethodError,
      );
      return {
        success: false,
        error: 'Could not determine payment method type',
      };
    }

    const paymentMethod = paymentMethodData.payment_methods as {
      name: string;
      is_online: boolean;
    };
    const isCashPayment = !paymentMethod.is_online;

    console.log(
      `[REFUND] Payment method: ${paymentMethod.name} (${isCashPayment ? 'cash' : 'card'})`,
    );

    // Get tips
    let bookingTips: Array<{
      id: string;
      amount: number;
      stripe_payment_intent_id?: string | null;
      status: string;
      refunded_amount: number;
    }> = [];

    const { data: booking } = await adminSupabase
      .from('booking_payments')
      .select('booking_id')
      .eq('id', bookingPayment.id)
      .single();

    if (booking) {
      const { data: tips } = await adminSupabase
        .from('tips')
        .select('id, amount, stripe_payment_intent_id, status, refunded_amount')
        .eq('booking_id', booking.booking_id)
        .eq('status', 'completed');

      if (tips) {
        bookingTips = tips;
        console.log(`[REFUND] Found ${bookingTips.length} tip(s)`);
      }
    }

    // =================================================================
    // PLANNING PHASE: Calculate refund distribution
    // =================================================================

    const refundAmountCents = Math.round(refundAmount * 100);
    const depositAmountCents = Math.round(
      (bookingPayment.deposit_amount || 0) * 100,
    );
    const balanceAmountCents = Math.round(
      (bookingPayment.balance_amount || 0) * 100,
    );

    const distributionResult = await calculateRefundDistribution(
      refundAmountCents,
      {
        deposit_payment_intent_id:
          bookingPayment.deposit_payment_intent_id || null,
        stripe_payment_intent_id:
          bookingPayment.stripe_payment_intent_id || null,
        deposit_amount: bookingPayment.deposit_amount || 0,
        balance_amount: bookingPayment.balance_amount || 0,
        service_fee: bookingPayment.service_fee || 0,
      },
      isCashPayment,
      bookingTips,
      supportRequestId,
    );

    if (!distributionResult.success) {
      console.error(
        '[REFUND] ❌ Refund distribution failed:',
        distributionResult.error,
      );
      return {
        success: false,
        error: distributionResult.error || 'Refund distribution failed',
      };
    }

    // =================================================================
    // EXECUTION PHASE: Execute all Stripe operations
    // =================================================================

    const executionResult = await executeRefundOperations(
      distributionResult.operations,
    );

    if (!executionResult.success) {
      console.error(
        '[REFUND] ❌ Stripe operations failed:',
        executionResult.error,
      );
      return {
        success: false,
        error: executionResult.error || 'Stripe operations failed',
      };
    }

    // Calculate total refunded
    const totalRefundedCents = distributionResult.operations.reduce(
      (sum, op) => {
        // For partial captures, the refund amount is in the metadata
        if (op.type === 'partial_capture') {
          return sum + parseInt(op.metadata.refunded_amount || '0');
        }
        return sum + op.amount;
      },
      0,
    );

    // =================================================================
    // DATABASE UPDATE PHASE: Update database ONLY after Stripe success
    // =================================================================

    const dbResult = await updateDatabaseAfterRefund(
      adminSupabase,
      supportRequestId,
      bookingPayment.id,
      executionResult.results,
      totalRefundedCents,
      depositAmountCents,
      balanceAmountCents,
    );

    if (!dbResult.success) {
      console.error('[REFUND] ❌ Database update failed:', dbResult.error);
      // This is critical: Stripe refund succeeded but DB update failed
      // Log for manual intervention
      console.error(
        `[REFUND] ⚠️⚠️⚠️ CRITICAL: Stripe refund succeeded but database update failed!`,
      );
      console.error(
        `[REFUND] Manual intervention required for support request: ${supportRequestId}`,
      );
      return {
        success: false,
        error: `Refund processed in Stripe but database update failed: ${dbResult.error}. Manual intervention required.`,
      };
    }

    // =================================================================
    // SUCCESS
    // =================================================================

    const primaryRefundId = executionResult.results.find(
      (r) => r.refundId,
    )?.refundId;

    console.log(
      `[REFUND] ====================================================`,
    );
    console.log(`[REFUND] ✅ REFUND COMPLETED SUCCESSFULLY`);
    console.log(`[REFUND] Total refunded: $${totalRefundedCents / 100}`);
    console.log(`[REFUND] Primary refund ID: ${primaryRefundId || 'N/A'}`);
    console.log(
      `[REFUND] ====================================================`,
    );

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
    console.error('[REFUND] ❌ Unexpected error:', error);
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
export async function handleStripeRefundWebhook(
  refund: Stripe.Refund,
): Promise<{ success: boolean; error?: string }> {
  console.log(
    `[WEBHOOK] Processing refund webhook event for refund ID: ${refund.id}, status: ${refund.status}`,
  );
  console.log(
    `[WEBHOOK] Refund metadata:`,
    JSON.stringify(refund.metadata || {}),
  );

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get the support request ID from the refund metadata
    const supportRequestId = refund.metadata?.support_request_id;
    const paymentIntentId = refund.payment_intent as string;

    // First try to find support request by ID from metadata
    if (supportRequestId) {
      console.log(
        `[WEBHOOK] Found support request ID in metadata: ${supportRequestId}`,
      );

      // Get the support request
      const { data: supportRequest, error: supportRequestError } =
        await supabase
          .from('support_requests')
          .select('*')
          .eq('id', supportRequestId)
          .single();

      if (!supportRequestError && supportRequest) {
        return await updateSupportRequestWithRefund(
          adminSupabase as SupabaseClient<Database>,
          supportRequest,
          refund,
        );
      } else {
        console.log(
          '[WEBHOOK] Support request not found by ID, trying to find by payment intent',
        );
      }
    } else {
      console.log(
        '[WEBHOOK] No support request ID in refund metadata, trying to find by payment intent',
      );
    }

    // If we couldn't find by ID or no ID was provided, try to find by payment intent
    if (paymentIntentId) {
      console.log(
        `[WEBHOOK] Searching for support request by payment intent: ${paymentIntentId}`,
      );

      // Find booking payment by payment intent (could be deposit or balance)
      const { data: bookingPayment } = await adminSupabase
        .from('booking_payments')
        .select('*, bookings!inner(support_requests(*))')
        .or(
          `stripe_payment_intent_id.eq.${paymentIntentId},deposit_payment_intent_id.eq.${paymentIntentId}`,
        )
        .single();

      if (bookingPayment) {
        const bookingData = bookingPayment.bookings as unknown as {
          support_requests?: Array<{
            id: string;
            appointment_id?: string | null;
            professional_id?: string | null;
          }>;
        };
        const supportRequests = bookingData?.support_requests;
        if (supportRequests && supportRequests.length > 0) {
          const supportRequest = supportRequests[0];
          if (supportRequest) {
            return await updateSupportRequestWithRefund(
              adminSupabase as SupabaseClient<Database>,
              supportRequest,
              refund,
            );
          }
        }
      }
    }

    console.log(
      '[WEBHOOK] Could not find associated support request for refund',
    );
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
  supportRequest: {
    id: string;
    appointment_id?: string | null;
    professional_id?: string | null;
  },
  refund: Stripe.Refund,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[WEBHOOK] Updating support request ${supportRequest.id} with refund status: ${refund.status}`,
    );

    // Check if this is a tip refund and handle separately
    if (refund.metadata?.refund_type === 'tip' && refund.metadata?.tip_id) {
      console.log(
        `[WEBHOOK] Processing tip refund for tip ID: ${refund.metadata.tip_id}`,
      );

      // Update the tip record
      const { error: tipUpdateError } = await supabase
        .from('tips')
        .update({
          refunded_amount: refund.amount / 100,
          refunded_at: new Date().toISOString(),
          stripe_refund_id: refund.id,
          status: refund.status === 'succeeded' ? 'refunded' : 'completed',
        })
        .eq('id', refund.metadata.tip_id);

      if (tipUpdateError) {
        console.error(
          '[WEBHOOK] Error updating tip refund status:',
          tipUpdateError,
        );
        return { success: false, error: tipUpdateError.message };
      }

      console.log('[WEBHOOK] Tip refund processed successfully');
      return { success: true };
    }

    // Handle failed refunds - revert database status
    if (refund.status === 'failed' || refund.status === 'canceled') {
      console.error(`[WEBHOOK] ⚠️ Refund failed or canceled: ${refund.id}`);

      // Find the support request and revert its status
      const { error: revertError } = await supabase
        .from('support_requests')
        .update({
          status: 'in_progress',
          resolution_notes: `Refund ${refund.status}: ${refund.failure_reason || 'Unknown reason'}`,
        })
        .eq('id', supportRequest.id)
        .eq('stripe_refund_id', refund.id);

      if (revertError) {
        console.error(
          '[WEBHOOK] Error reverting support request:',
          revertError,
        );
        return { success: false, error: revertError.message };
      }

      console.log(
        '[WEBHOOK] Reverted support request status due to failed refund',
      );
      return { success: true };
    }

    // Update the support request for successful refunds
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
      updateData.resolution_notes =
        'Automatically resolved via successful Stripe refund';

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
          console.log(
            '[WEBHOOK] No admin user found, keeping status as in_progress',
          );
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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
