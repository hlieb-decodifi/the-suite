import type {
  StripeCheckoutParams,
  PaymentProcessingResult,
  BookingWithPaymentData,
} from './types';
import {
  getProfessionalProfileForPayment,
  calculatePaymentAmounts,
  createBookingPaymentRecord,
  updateBookingPaymentWithSession,
} from './db';
import { createStripeCheckoutSession } from './stripe-operations';

/**
 * Process booking payment using Stripe
 */
export async function processBookingPayment(
  bookingData: BookingWithPaymentData,
  paymentMethodId: string,
  serviceFee: number,
  tipAmount: number = 0,
): Promise<PaymentProcessingResult> {
  try {
    const { bookingId, totalPrice, paymentCalculation, professionalProfile } =
      bookingData;

    if (!professionalProfile.stripe_account_id) {
      return {
        success: false,
        error: 'Professional has not connected their Stripe account',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Convert to cents for Stripe
    const totalAmountInCents = Math.round(totalPrice * 100);

    // Determine payment type based on deposit settings
    let paymentType: 'full' | 'deposit' | 'setup_only';

    if (!paymentCalculation.requiresDeposit) {
      // No deposit required - for card payments, we either charge full amount or setup for later
      if (paymentCalculation.requiresBalancePayment) {
        // Full amount will be charged later, setup payment method first
        paymentType = 'setup_only';
      } else {
        // Full amount charged immediately
        paymentType = 'full';
      }
    } else {
      if (paymentCalculation.isFullPayment) {
        // Deposit covers full amount
        paymentType = 'full';
      } else {
        // Partial deposit
        paymentType = 'deposit';
      }
    }

    // Create booking payment record first
    const paymentRecordResult = await createBookingPaymentRecord(
      bookingId,
      paymentMethodId,
      paymentCalculation,
      serviceFee,
      tipAmount,
    );

    if (!paymentRecordResult.success) {
      return {
        success: false,
        error: paymentRecordResult.error || 'Failed to create payment record',
        requiresPayment: false,
        paymentType,
      };
    }

    // For Stripe payment service, we always require payment through Stripe
    // (cash payments would be handled through a different service)

    // Create Stripe checkout session
    const checkoutParams: StripeCheckoutParams = {
      bookingId,
      clientId: professionalProfile.user_id, // This should be the client ID, will be passed from the calling function
      professionalStripeAccountId: professionalProfile.stripe_account_id,
      amount: totalAmountInCents,
      depositAmount: paymentCalculation.depositAmount,
      balanceAmount: paymentCalculation.balanceAmount,
      paymentType,
      requiresBalancePayment: paymentCalculation.requiresBalancePayment,
      metadata: {
        booking_id: bookingId,
        professional_profile_id: professionalProfile.id,
        total_amount: totalAmountInCents.toString(),
        service_fee: (serviceFee * 100).toString(),
        tip_amount: (tipAmount * 100).toString(),
      },
    };

    const checkoutResult = await createStripeCheckoutSession(checkoutParams);

    if (!checkoutResult.success) {
      return {
        success: false,
        error: checkoutResult.error || 'Failed to create checkout session',
        requiresPayment: true,
        paymentType,
      };
    }

    // Update payment record with session ID
    if (checkoutResult.sessionId) {
      await updateBookingPaymentWithSession(
        bookingId,
        checkoutResult.sessionId,
      );
    }

    const result: PaymentProcessingResult = {
      success: true,
      bookingId,
      requiresPayment: true,
      paymentType,
    };

    if (checkoutResult.checkoutUrl) {
      result.checkoutUrl = checkoutResult.checkoutUrl;
    }

    return result;
  } catch (error) {
    console.error('Error processing booking payment:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error processing payment',
      requiresPayment: false,
      paymentType: 'full',
    };
  }
}

/**
 * Create booking with payment processing
 */
export async function createBookingWithPayment(
  bookingId: string,
  professionalProfileId: string,
  totalPrice: number,
  paymentMethodId: string,
  serviceFee: number,
  tipAmount: number = 0,
  clientId: string,
): Promise<PaymentProcessingResult> {
  try {
    // Get professional profile for payment processing
    const professionalProfile = await getProfessionalProfileForPayment(
      professionalProfileId,
    );

    if (!professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Create booking with payment data
    const bookingWithPaymentData: BookingWithPaymentData = {
      bookingId,
      totalPrice,
      paymentCalculation: await calculatePaymentAmounts(
        Math.round(totalPrice * 100),
        professionalProfile,
      ),
      professionalProfile,
    };

    // Update the checkout params to use the correct client ID
    const result = await processBookingPayment(
      bookingWithPaymentData,
      paymentMethodId,
      serviceFee,
      tipAmount,
    );

    // Fix the client ID in the checkout URL if needed
    if (result.success && result.checkoutUrl) {
      // The checkout session was created with the wrong client ID, we need to recreate it
      const checkoutParams: StripeCheckoutParams = {
        bookingId,
        clientId, // Use the correct client ID
        professionalStripeAccountId: professionalProfile.stripe_account_id!,
        amount: Math.round(totalPrice * 100),
        depositAmount: bookingWithPaymentData.paymentCalculation.depositAmount,
        balanceAmount: bookingWithPaymentData.paymentCalculation.balanceAmount,
        paymentType: result.paymentType,
        requiresBalancePayment:
          bookingWithPaymentData.paymentCalculation.requiresBalancePayment,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfile.id,
          total_amount: (totalPrice * 100).toString(),
          service_fee: (serviceFee * 100).toString(),
          tip_amount: (tipAmount * 100).toString(),
        },
      };

      const checkoutResult = await createStripeCheckoutSession(checkoutParams);

      if (checkoutResult.success && checkoutResult.sessionId) {
        await updateBookingPaymentWithSession(
          bookingId,
          checkoutResult.sessionId,
        );

        const updatedResult: PaymentProcessingResult = {
          ...result,
        };

        if (checkoutResult.checkoutUrl) {
          updatedResult.checkoutUrl = checkoutResult.checkoutUrl;
        }

        return updatedResult;
      }
    }

    return result;
  } catch (error) {
    console.error('Error creating booking with payment:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error creating booking with payment',
      requiresPayment: false,
      paymentType: 'full',
    };
  }
}
