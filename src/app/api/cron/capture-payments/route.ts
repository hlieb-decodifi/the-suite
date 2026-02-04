import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsPendingCapture,
  markPaymentCaptured,
} from '@/server/domains/stripe-payments/db';
import { capturePaymentIntent } from '@/server/domains/stripe-payments/stripe-operations';
import { chainToStaging } from '@/lib/utils/cron-chain';

export const runtime = 'nodejs';

/**
 * Cron job to capture authorized payments
 * Runs every 4 hours to check for payments that need to be captured
 */
export async function GET(request: NextRequest) {
  // Authenticate request - only allow execution from Vercel cron
  const authHeader = request.headers.get('authorization');
  console.log('🔐 Auth header present:', !!authHeader);

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized request - invalid auth header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('✅ Authentication successful');
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    console.log('[CRON] Starting payment capture processing...');

    // Get payments that need to be captured
    const pendingCaptures = await getPaymentsPendingCapture(100);

    console.log(
      `[CRON] Found ${pendingCaptures.length} payments pending capture`,
    );

    if (pendingCaptures.length === 0) {
      // Chain to staging even when no work was done
      await chainToStaging({
        endpoint: '/api/cron/capture-payments',
        awaitCompletion: false,
      });

      return NextResponse.json({
        success: true,
        message: 'No payments need capturing',
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process each payment
    for (const payment of pendingCaptures) {
      try {
        console.log(
          `[CRON] Capturing payment for booking: ${payment.booking_id}`,
        );

        // Defensive check: Verify payment hasn't been refunded (in case query missed it)
        // This prevents capturing payments for cancelled bookings
        const { createAdminClient } = await import('@/lib/supabase/server');
        const supabase = createAdminClient();
        const { data: paymentCheck } = await supabase
          .from('booking_payments')
          .select('refunded_at, status')
          .eq('id', payment.id)
          .single();

        if (paymentCheck?.refunded_at) {
          console.log(
            `[CRON] ⏭️ Skipping booking ${payment.booking_id} - payment has been refunded (booking cancelled)`,
          );
          continue; // Skip to next payment
        }

        // Calculate amount to capture based on payment method
        // - Online payment: Capture balance_amount (full balance via Stripe)
        // - Cash payment without deposit: Capture amount (service fee only, balance is cash)
        const isCashPayment = !payment.is_online_payment;
        const hasDeposit = payment.deposit_amount > 0;

        let totalCaptureAmount: number;
        if (isCashPayment && !hasDeposit) {
          // Cash payment without deposit: Only capture service fee (amount field)
          totalCaptureAmount = payment.amount;
          console.log(
            `[CRON] Cash payment (no deposit) - capturing service fee: $${payment.amount / 100}`,
          );
        } else if (isCashPayment && hasDeposit) {
          // This shouldn't happen (cash with deposit shouldn't be in capture queue)
          console.log(
            `[CRON] ⚠️ Warning: Cash payment with deposit in capture queue for booking ${payment.booking_id}. Skipping.`,
          );
          continue;
        } else {
          // Online payment: Capture full balance amount
          totalCaptureAmount = payment.balance_amount;
          console.log(
            `[CRON] Online payment - capturing balance: $${payment.balance_amount / 100}`,
          );
        }

        // Capture the payment intent
        const result = await capturePaymentIntent(
          payment.stripe_payment_intent_id,
          totalCaptureAmount > 0 ? totalCaptureAmount : undefined,
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to capture payment intent');
        }

        // Mark payment as captured in database
        const updateResult = await markPaymentCaptured(payment.id);

        if (!updateResult.success) {
          throw new Error(
            updateResult.error || 'Failed to update payment status',
          );
        }

        processedCount++;
        console.log(
          `[CRON] Successfully captured payment for booking: ${payment.booking_id}, Amount: $${(result.capturedAmount || totalCaptureAmount) / 100}`,
        );

        // Payment confirmation emails have been removed
        console.log(
          `[CRON] ℹ️ Payment confirmation emails are no longer sent for booking: ${payment.booking_id}`,
        );
      } catch (error) {
        errorCount++;
        const errorMessage = `Booking ${payment.booking_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(
          `[CRON] Error capturing payment for booking ${payment.booking_id}:`,
          error,
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[CRON] Payment capture processing completed. Processed: ${processedCount}, Errors: ${errorCount}, Duration: ${duration}ms`,
    );

    // Chain to staging environment (fire and forget)
    await chainToStaging({
      endpoint: '/api/cron/capture-payments',
      awaitCompletion: false,
    });

    return NextResponse.json({
      success: true,
      message: `Payment capture processing completed`,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      duration,
    });
  } catch (error) {
    console.error('[CRON] Fatal error in payment capture processing:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Fatal error in payment capture processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: processedCount,
        errors: errorCount + 1,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
