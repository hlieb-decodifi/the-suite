import type {
  PaymentProcessingResult,
  StripeCheckoutParams,
  BookingWithPaymentData
} from './types';
import {
  getProfessionalProfileForPayment,
  calculatePaymentAmounts,
  createBookingPaymentRecord,
  updateBookingPaymentWithSession
} from './db';
import { createStripeCheckoutSession } from './stripe-operations';

/**
 * Process payment for a booking based on professional's deposit settings
 */
export async function processBookingPayment(
  bookingData: BookingWithPaymentData,
  paymentMethodId: string,
  serviceFee: number,
  tipAmount: number = 0
): Promise<PaymentProcessingResult> {
  try {
    const { bookingId, totalPrice, professionalProfile } = bookingData;

    // Check if professional has Stripe Connect account
    if (!professionalProfile.stripe_account_id || professionalProfile.stripe_connect_status !== 'complete') {
      return {
        success: false,
        error: 'Professional does not have a complete Stripe Connect account',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Calculate payment amounts based on deposit settings
    const totalAmountInCents = Math.round(totalPrice * 100);
    const paymentCalculation = calculatePaymentAmounts(totalAmountInCents, professionalProfile);

    // Determine payment type based on deposit settings
    let paymentType: 'full' | 'deposit' | 'setup_only';

    if (!paymentCalculation.requiresDeposit) {
      // No deposit required - check if we need to charge full amount or just setup payment method
      if (paymentCalculation.requiresBalancePayment && paymentCalculation.balancePaymentMethod === 'card') {
        // Full amount will be charged via card, but we need to setup payment method first
        paymentType = 'setup_only';
      } else {
        // Full amount charged immediately (cash balance payment or no balance payment needed)
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
      tipAmount
    );

    if (!paymentRecordResult.success) {
      return {
        success: false,
        error: paymentRecordResult.error || 'Failed to create payment record',
        requiresPayment: false,
        paymentType
      };
    }

    // If no payment is required (cash only), return success
    if (paymentType === 'full' && paymentCalculation.balancePaymentMethod === 'cash' && !paymentCalculation.requiresDeposit) {
      return {
        success: true,
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

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
      balancePaymentMethod: paymentCalculation.balancePaymentMethod,
      metadata: {
        booking_id: bookingId,
        professional_profile_id: professionalProfile.id,
        total_amount: totalAmountInCents.toString(),
        service_fee: (serviceFee * 100).toString(),
        tip_amount: (tipAmount * 100).toString()
      }
    };

    const checkoutResult = await createStripeCheckoutSession(checkoutParams);

    if (!checkoutResult.success) {
      return {
        success: false,
        error: checkoutResult.error || 'Failed to create checkout session',
        requiresPayment: true,
        paymentType
      };
    }

    // Update payment record with session ID
    if (checkoutResult.sessionId) {
      await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId);
    }

    const result: PaymentProcessingResult = {
      success: true,
      bookingId,
      requiresPayment: true,
      paymentType
    };

    if (checkoutResult.checkoutUrl) {
      result.checkoutUrl = checkoutResult.checkoutUrl;
    }

    return result;

  } catch (error) {
    console.error('Error processing booking payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing payment',
      requiresPayment: false,
      paymentType: 'full'
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
  clientId: string
): Promise<PaymentProcessingResult> {
  try {
    // Get professional profile for payment processing
    const professionalProfile = await getProfessionalProfileForPayment(professionalProfileId);
    
    if (!professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Create booking with payment data
    const bookingWithPaymentData: BookingWithPaymentData = {
      bookingId,
      totalPrice,
      paymentCalculation: calculatePaymentAmounts(Math.round(totalPrice * 100), professionalProfile),
      professionalProfile
    };

    // Update the checkout params to use the correct client ID
    const result = await processBookingPayment(
      bookingWithPaymentData,
      paymentMethodId,
      serviceFee,
      tipAmount
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
        requiresBalancePayment: bookingWithPaymentData.paymentCalculation.requiresBalancePayment,
        balancePaymentMethod: bookingWithPaymentData.paymentCalculation.balancePaymentMethod,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfile.id,
          total_amount: (totalPrice * 100).toString(),
          service_fee: (serviceFee * 100).toString(),
          tip_amount: (tipAmount * 100).toString()
        }
      };

      const checkoutResult = await createStripeCheckoutSession(checkoutParams);
      
      if (checkoutResult.success && checkoutResult.sessionId) {
        await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId);
        
        const updatedResult: PaymentProcessingResult = {
          ...result
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
      error: error instanceof Error ? error.message : 'Unknown error creating booking with payment',
      requiresPayment: false,
      paymentType: 'full'
    };
  }
} 