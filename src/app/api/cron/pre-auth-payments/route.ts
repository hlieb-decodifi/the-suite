import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsPendingPreAuth,
  markPaymentPreAuthorized,
} from '@/server/domains/stripe-payments/db';
import { createUncapturedPaymentIntent } from '@/server/domains/stripe-payments/stripe-operations';

export const runtime = 'nodejs';

/**
 * Cron job to process pre-authorization payments
 * Runs twice daily to check for payments that need pre-authorization
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
    console.log('[CRON] Starting pre-auth payments processing...');

    // Get payments that need pre-authorization
    const pendingPayments = await getPaymentsPendingPreAuth(100);

    console.log(
      `[CRON] Found ${pendingPayments.length} payments pending pre-auth`,
    );

    if (pendingPayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No payments need pre-authorization',
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process each payment
    for (const payment of pendingPayments) {
      try {
        console.log(
          `[CRON] Processing pre-auth for booking: ${payment.booking_id}`,
        );

        // Create uncaptured payment intent
        const result = await createUncapturedPaymentIntent(
          payment.amount,
          payment.customer_id,
          payment.professional_stripe_account_id,
          {
            booking_id: payment.booking_id,
            cron_job: 'pre_auth_payments',
            scheduled_for: payment.pre_auth_scheduled_for,
          },
          payment.stripe_payment_method_id || undefined, // Pass payment method ID from setup intent
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to create payment intent');
        }

        // Mark payment as pre-authorized in database
        const updateResult = await markPaymentPreAuthorized(
          payment.id,
          result.paymentIntentId!,
        );

        if (!updateResult.success) {
          throw new Error(
            updateResult.error || 'Failed to update payment status',
          );
        }

        processedCount++;
        console.log(
          `[CRON] Successfully pre-authorized payment for booking: ${payment.booking_id}`,
        );
      } catch (error) {
        errorCount++;
        const errorMessage = `Booking ${payment.booking_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(
          `[CRON] Error processing pre-auth for booking ${payment.booking_id}:`,
          error,
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[CRON] Pre-auth processing completed. Processed: ${processedCount}, Errors: ${errorCount}, Duration: ${duration}ms`,
    );

    return NextResponse.json({
      success: true,
      message: `Pre-auth processing completed`,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      duration,
    });
  } catch (error) {
    console.error('[CRON] Fatal error in pre-auth payments processing:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Fatal error in pre-auth payments processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: processedCount,
        errors: errorCount + 1,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
