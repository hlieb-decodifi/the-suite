'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

/**
 * Cancel existing uncaptured payment intent and create a new one with additional services
 * This is needed because Stripe doesn't allow modifying PaymentIntents created by Checkout
 */
export async function replaceBalancePaymentWithAdditionalServices(
  paymentIntentId: string,
  originalAmount: number, // in cents
  additionalAmount: number, // in cents
  customerId: string,
  paymentMethodId: string,
  professionalStripeAccountId?: string,
  metadata?: Record<string, string>,
): Promise<{
  success: boolean;
  newPaymentIntentId?: string;
  updatedAmount?: number;
  authorizationExpiresAt?: Date;
  error?: string;
  immediatePayment?: boolean;
}> {
  try {
    console.log(
      '[replaceBalancePaymentWithAdditionalServices] Starting replacement:',
      {
        paymentIntentId,
        originalAmount: originalAmount / 100,
        additionalAmount: additionalAmount / 100,
        newTotal: (originalAmount + additionalAmount) / 100,
      },
    );

    // First, retrieve the payment intent to check its current status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(
      '[replaceBalancePaymentWithAdditionalServices] Current PaymentIntent status:',
      {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        amount_capturable: paymentIntent.amount_capturable,
      },
    );

    if (paymentIntent.status === 'succeeded') {
      // Payment has already been captured, create an immediate payment for additional services only
      console.log(
        '[replaceBalancePaymentWithAdditionalServices] Payment already captured, creating immediate payment for additional services only',
      );

      const { createBalancePaymentIntent } = await import(
        './stripe-operations'
      );

      // Create an immediate payment intent for additional services (not uncaptured)
      const newPaymentResult = await createBalancePaymentIntent(
        '', // bookingId - not needed for immediate payment
        additionalAmount, // Only charge for additional services
        customerId,
        paymentMethodId,
        professionalStripeAccountId || '',
        {
          ...paymentIntent.metadata,
          ...metadata,
          additional_services_only: 'true',
          additional_amount: additionalAmount.toString(),
          original_payment_intent: paymentIntentId,
          original_status: 'succeeded',
          payment_type: 'additional_services_immediate',
        },
      );

      if (!newPaymentResult.success || !newPaymentResult.paymentIntentId) {
        return {
          success: false,
          error: `Failed to create immediate payment for additional services: ${newPaymentResult.error}`,
        };
      }

      console.log(
        '[replaceBalancePaymentWithAdditionalServices] Successfully processed immediate payment for additional services:',
        {
          originalId: paymentIntentId,
          newId: newPaymentResult.paymentIntentId,
          additionalAmount: additionalAmount,
        },
      );

      return {
        success: true,
        newPaymentIntentId: newPaymentResult.paymentIntentId,
        updatedAmount: additionalAmount, // Only the additional amount was charged
        immediatePayment: true, // Flag to indicate this was charged immediately
      };
    }

    if (paymentIntent.status !== 'requires_capture') {
      return {
        success: false,
        error: `PaymentIntent status is ${paymentIntent.status}, expected 'requires_capture' or 'succeeded'`,
      };
    }

    const newTotalAmount = originalAmount + additionalAmount;

    console.log(
      '[replaceBalancePaymentWithAdditionalServices] Step 1: Canceling existing payment intent',
    );

    // Step 1: Cancel the existing payment intent
    await stripe.paymentIntents.cancel(paymentIntentId);

    console.log(
      '[replaceBalancePaymentWithAdditionalServices] Step 2: Creating new payment intent with updated amount',
    );

    // Step 2: Create a new uncaptured payment intent with the new total amount
    const { createUncapturedPaymentIntent } = await import(
      './stripe-operations'
    );

    const newPaymentResult = await createUncapturedPaymentIntent(
      newTotalAmount,
      customerId,
      professionalStripeAccountId || '',
      {
        ...paymentIntent.metadata,
        ...metadata,
        additional_services_added: 'true',
        additional_amount: additionalAmount.toString(),
        original_amount: originalAmount.toString(),
        replaced_payment_intent: paymentIntentId,
      },
      paymentMethodId,
    );

    if (!newPaymentResult.success || !newPaymentResult.paymentIntentId) {
      return {
        success: false,
        error: `Failed to create new payment intent: ${newPaymentResult.error}`,
      };
    }

    console.log(
      '[replaceBalancePaymentWithAdditionalServices] Successfully replaced payment intent:',
      {
        oldId: paymentIntentId,
        newId: newPaymentResult.paymentIntentId,
        amount: newTotalAmount,
        authorizationExpiresAt:
          newPaymentResult.authorizationExpiresAt?.toISOString(),
      },
    );

    return {
      success: true,
      newPaymentIntentId: newPaymentResult.paymentIntentId,
      updatedAmount: newTotalAmount,
      ...(newPaymentResult.authorizationExpiresAt && {
        authorizationExpiresAt: newPaymentResult.authorizationExpiresAt,
      }),
    };
  } catch (error) {
    console.error(
      '[replaceBalancePaymentWithAdditionalServices] Error replacing payment intent:',
      error,
    );

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: `Stripe error: ${error.message}`,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error replacing payment intent',
    };
  }
}

/**
 * Process additional services payment by replacing the existing uncaptured balance payment
 */
export async function processAdditionalServicesBalancePayment({
  balancePaymentIntentId,
  originalAmount, // in cents
  additionalAmount, // in cents
  bookingId,
  customerId,
  paymentMethodId,
  professionalStripeAccountId,
}: {
  balancePaymentIntentId: string;
  originalAmount: number;
  additionalAmount: number;
  bookingId: string;
  customerId: string;
  paymentMethodId: string;
  professionalStripeAccountId?: string;
}): Promise<{
  success: boolean;
  newPaymentIntentId?: string;
  updatedAmount?: number;
  error?: string;
  immediatePayment?: boolean;
}> {
  console.log(
    '[processAdditionalServicesBalancePayment] Starting payment processing:',
    {
      balancePaymentIntentId,
      originalAmount: originalAmount / 100,
      additionalAmount: additionalAmount / 100,
      bookingId,
      customerId,
      paymentMethodId,
    },
  );

  try {
    // Replace the existing balance payment intent with a new one including additional services
    const replaceResult = await replaceBalancePaymentWithAdditionalServices(
      balancePaymentIntentId,
      originalAmount,
      additionalAmount,
      customerId,
      paymentMethodId,
      professionalStripeAccountId,
      {
        additional_services_added: 'true',
        additional_amount: additionalAmount.toString(),
        booking_id: bookingId,
      },
    );

    if (!replaceResult.success) {
      console.error(
        '[processAdditionalServicesBalancePayment] Failed to replace payment intent:',
        replaceResult.error,
      );
      return {
        success: false,
        error: replaceResult.error || 'Unknown error replacing payment intent',
      };
    }

    console.log(
      '[processAdditionalServicesBalancePayment] Successfully replaced balance payment intent:',
      {
        oldPaymentIntentId: balancePaymentIntentId,
        newPaymentIntentId: replaceResult.newPaymentIntentId,
        newAmount: replaceResult.updatedAmount
          ? replaceResult.updatedAmount / 100
          : 'unknown',
      },
    );

    return {
      success: true,
      ...(replaceResult.newPaymentIntentId && {
        newPaymentIntentId: replaceResult.newPaymentIntentId,
      }),
      ...(replaceResult.updatedAmount !== undefined && {
        updatedAmount: replaceResult.updatedAmount,
      }),
      immediatePayment: false, // This is a regular replacement, not immediate payment
    };
  } catch (error) {
    console.error(
      '[processAdditionalServicesBalancePayment] Unexpected error:',
      error,
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error processing balance payment',
    };
  }
}

/**
 * Check if we can update a balance payment intent (must be uncaptured)
 */
export async function canUpdateBalancePayment(
  paymentIntentId: string,
): Promise<{ canUpdate: boolean; currentAmount?: number; error?: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      canUpdate: paymentIntent.status === 'requires_capture',
      currentAmount: paymentIntent.amount,
    };
  } catch (error) {
    console.error(
      '[canUpdateBalancePayment] Error checking payment intent:',
      error,
    );
    return {
      canUpdate: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error checking payment intent',
    };
  }
}
