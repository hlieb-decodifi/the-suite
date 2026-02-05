import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentsPendingPreAuth,
  markPaymentPreAuthorized,
} from '@/server/domains/stripe-payments/db';
import { createUncapturedPaymentIntent } from '@/server/domains/stripe-payments/stripe-operations';
import { chainToStaging } from '@/lib/utils/cron-chain';

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
      // Chain to staging even when no work was done
      await chainToStaging({
        endpoint: '/api/cron/pre-auth-payments',
        awaitCompletion: false,
      });

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

        // Defensive check: payment method should always exist due to query filter
        // This should never happen, but if it does, skip and log error
        if (!payment.stripe_payment_method_id) {
          console.error(
            `[CRON] ❌ Skipping booking ${payment.booking_id} - missing payment method ID. This indicates a data integrity issue or cash payment that wasn't filtered.`,
          );
          continue; // Skip to next payment
        }

        // Defensive check: Verify payment hasn't been refunded (in case query missed it)
        // This prevents processing payments for cancelled bookings
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

        // Determine payment routing:
        // - Cash payment without deposit: Direct to platform (service fee only)
        // - Online payment or cash with deposit: Route through connected account
        const isCashPayment = !payment.is_online_payment;
        const hasDeposit = payment.deposit_amount > 0;
        const isDirectPlatformPayment = isCashPayment && !hasDeposit;

        const stripeAccountId = isDirectPlatformPayment
          ? null // Direct platform payment
          : payment.professional_stripe_account_id; // Connected account payment

        console.log(
          `[CRON] Payment routing for ${payment.booking_id}: ${isDirectPlatformPayment ? 'Direct platform (service fee)' : 'Connected account'}`,
        );

        // Create uncaptured payment intent with confirmed payment method
        const result = await createUncapturedPaymentIntent(
          payment.amount,
          payment.customer_id,
          stripeAccountId,
          {
            booking_id: payment.booking_id,
            cron_job: 'pre_auth_payments',
            scheduled_for: payment.pre_auth_scheduled_for,
            payment_routing: isDirectPlatformPayment ? 'platform' : 'connected',
          },
          payment.stripe_payment_method_id, // Required: payment method from setup intent
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to create payment intent');
        }

        // Log authorization expiration for monitoring
        if (result.authorizationExpiresAt) {
          const holdDurationHours =
            (result.authorizationExpiresAt.getTime() - Date.now()) /
            (60 * 60 * 1000);
          console.log(
            `[CRON] Authorization for booking ${payment.booking_id} expires at ${result.authorizationExpiresAt.toISOString()} (${holdDurationHours.toFixed(1)} hours from now)`,
          );
        } else {
          console.log(
            `[CRON] ⚠️ No authorization expiration returned for booking ${payment.booking_id} - using fallback`,
          );
        }

        // Mark payment as pre-authorized in database with REAL expiration from Stripe
        const updateResult = await markPaymentPreAuthorized(
          payment.id,
          result.paymentIntentId!,
          result.authorizationExpiresAt, // Pass the real expiration from Stripe
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

    // Chain to staging environment (fire and forget)
    await chainToStaging({
      endpoint: '/api/cron/pre-auth-payments',
      awaitCompletion: false,
    });

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
