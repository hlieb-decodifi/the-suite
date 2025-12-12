#!/usr/bin/env npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Script to fix uncaptured payments that were incorrectly marked as captured in the database
 *
 * This script:
 * 1. Takes an array of payment intent IDs
 * 2. Checks each one in Stripe to see if it's actually captured
 * 3. If uncaptured, attempts to capture it
 * 4. Updates the database with the correct status
 *
 * Usage:
 * npx tsx scripts/fix-uncaptured-payments.ts
 */

import Stripe from 'stripe';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  console.error(
    '💡 Make sure to run with: node -r dotenv/config scripts/fix-uncaptured-payments.ts',
  );
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-04-30.basil',
});

// Payment intent IDs to check and fix
// Replace this array with the results from your SQL query
const PAYMENT_INTENT_IDS: string[] = [];
// Add your payment intent IDs here, e.g.:
// 'pi_3Sb5ThLMOPuguC731czsFU0l',
// 'pi_3SdcXmLMOPuguC730BOEPLDp',

type PaymentIntentResult = {
  id: string;
  status: 'captured' | 'uncaptured' | 'not_found' | 'error';
  message: string;
  amount?: number;
  amountCapturable?: number;
};

async function checkAndCapturePayment(
  paymentIntentId: string,
): Promise<PaymentIntentResult> {
  try {
    console.log(`\n🔍 Checking payment intent: ${paymentIntentId}`);

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Amount: $${paymentIntent.amount / 100}`);
    console.log(
      `   Amount capturable: $${paymentIntent.amount_capturable / 100}`,
    );
    console.log(`   Capture method: ${paymentIntent.capture_method}`);

    // Check if already captured
    if (
      paymentIntent.amount_capturable === 0 &&
      paymentIntent.amount_received > 0
    ) {
      console.log(`   ✅ Already captured`);
      return {
        id: paymentIntentId,
        status: 'captured',
        message: 'Already captured in Stripe',
        amount: paymentIntent.amount_received,
      };
    }

    // Check if it can be captured
    if (paymentIntent.amount_capturable > 0) {
      console.log(
        `   💰 Attempting to capture $${paymentIntent.amount_capturable / 100}...`,
      );

      try {
        const captured = await stripe.paymentIntents.capture(paymentIntentId);
        console.log(`   ✅ Successfully captured!`);
        return {
          id: paymentIntentId,
          status: 'captured',
          message: 'Successfully captured',
          amount: captured.amount_received,
        };
      } catch (captureError: any) {
        console.error(`   ❌ Failed to capture: ${captureError.message}`);
        return {
          id: paymentIntentId,
          status: 'error',
          message: `Capture failed: ${captureError.message}`,
          amountCapturable: paymentIntent.amount_capturable,
        };
      }
    }

    // Payment intent exists but can't be captured
    console.log(`   ⚠️ Cannot capture (status: ${paymentIntent.status})`);
    return {
      id: paymentIntentId,
      status: 'uncaptured',
      message: `Cannot capture - status: ${paymentIntent.status}`,
      amountCapturable: paymentIntent.amount_capturable,
    };
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      console.error(`   ❌ Payment intent not found in Stripe`);
      return {
        id: paymentIntentId,
        status: 'not_found',
        message: 'Payment intent not found in Stripe',
      };
    }

    console.error(`   ❌ Error: ${error.message}`);
    return {
      id: paymentIntentId,
      status: 'error',
      message: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Starting uncaptured payments fix script\n');
  console.log(
    `📋 Processing ${PAYMENT_INTENT_IDS.length} payment intents...\n`,
  );

  if (PAYMENT_INTENT_IDS.length === 0) {
    console.log('⚠️  No payment intent IDs provided.');
    console.log(
      '📝 Please add payment intent IDs to the PAYMENT_INTENT_IDS array in this script.',
    );
    console.log('\nTo get the list, run this SQL query in Supabase:');
    console.log(`
SELECT bp.stripe_payment_intent_id
FROM booking_payments bp
INNER JOIN bookings b ON bp.booking_id = b.id
INNER JOIN appointments a ON b.id = a.booking_id
WHERE a.end_time < NOW()
  AND bp.capture_method = 'manual'
  AND bp.capture_scheduled_for IS NULL
  AND bp.captured_at IS NOT NULL
  AND bp.stripe_payment_intent_id IS NOT NULL
ORDER BY bp.created_at DESC;
    `);
    return;
  }

  const results: PaymentIntentResult[] = [];

  // Process each payment intent
  for (const paymentIntentId of PAYMENT_INTENT_IDS) {
    const result = await checkAndCapturePayment(paymentIntentId);
    results.push(result);

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const captured = results.filter((r) => r.status === 'captured');
  const uncaptured = results.filter((r) => r.status === 'uncaptured');
  const notFound = results.filter((r) => r.status === 'not_found');
  const errors = results.filter((r) => r.status === 'error');

  console.log(`\n✅ Successfully captured: ${captured.length}`);
  if (captured.length > 0) {
    captured.forEach((r) => {
      console.log(`   - ${r.id}: $${(r.amount || 0) / 100}`);
    });
  }

  console.log(`\n⚠️  Could not capture: ${uncaptured.length}`);
  if (uncaptured.length > 0) {
    uncaptured.forEach((r) => {
      console.log(`   - ${r.id}: ${r.message}`);
    });
  }

  console.log(`\n❌ Not found: ${notFound.length}`);
  if (notFound.length > 0) {
    notFound.forEach((r) => {
      console.log(`   - ${r.id}`);
    });
  }

  console.log(`\n💥 Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach((r) => {
      console.log(`   - ${r.id}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Script completed!');
  console.log('\n📝 Next steps:');
  console.log(
    '1. The payments that were successfully captured will be updated in the database via webhooks',
  );
  console.log(
    '2. For payments that could not be captured, check the Stripe dashboard for more details',
  );
  console.log(
    '3. For expired authorizations, you may need to create new payment intents\n',
  );
}

// Run the script
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
