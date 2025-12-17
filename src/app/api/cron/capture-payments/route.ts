import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsPendingCapture,
  markPaymentCaptured,
} from '@/server/domains/stripe-payments/db';
import { capturePaymentIntent } from '@/server/domains/stripe-payments/stripe-operations';

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

        // Calculate amount to capture based on payment type
        let totalCaptureAmount: number;

        if (payment.payment_type === 'deposit') {
          // For deposit payments, capture the balance amount + tip
          totalCaptureAmount = payment.balance_amount + payment.tip_amount;
          console.log(
            `[CRON] Deposit payment detected - capturing balance: $${payment.balance_amount / 100} + tip: $${payment.tip_amount / 100} = $${totalCaptureAmount / 100}`,
          );
        } else {
          // For full payments, capture the full amount + tip
          totalCaptureAmount = payment.amount + payment.tip_amount;
          console.log(
            `[CRON] Full payment detected - capturing total: $${payment.amount / 100} + tip: $${payment.tip_amount / 100} = $${totalCaptureAmount / 100}`,
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
