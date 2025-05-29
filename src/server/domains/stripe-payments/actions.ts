'use server';

import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@/components/templates/BookingModalTemplate/actions';
import type { BookingFormValues } from '@/components/forms/BookingForm/schema';
import type { PaymentProcessingResult } from './types';

/**
 * Create a booking with Stripe payment processing
 */
export async function createBookingWithStripePayment(
  formData: BookingFormValues,
  professionalProfileId: string
): Promise<PaymentProcessingResult> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Check if the selected payment method is Credit Card (online payment)
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('name, is_online')
      .eq('id', formData.paymentMethodId)
      .single();

    // If payment method is not Credit Card, use the existing booking flow
    if (!paymentMethod?.is_online || paymentMethod.name !== 'Credit Card') {
      try {
        const bookingResult = await createBooking(formData, professionalProfileId);
        return {
          success: true,
          bookingId: bookingResult.bookingId,
          requiresPayment: false,
          paymentType: 'full'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create booking',
          requiresPayment: false,
          paymentType: 'full'
        };
      }
    }

    // For Credit Card payments, we need to create the booking first and then handle Stripe payment
    // But we need to avoid the duplicate payment record issue
    
    // First, create the booking using the existing flow
    const bookingResult = await createBooking(formData, professionalProfileId);
    
    if (!bookingResult.bookingId) {
      return {
        success: false,
        error: 'Failed to create booking',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Now we need to check if this professional requires Stripe payment processing
    // Get professional profile to check deposit settings and Stripe status
    const { getProfessionalProfileForPayment, calculatePaymentAmounts } = await import('./db');
    const { createStripeCheckoutSession } = await import('./stripe-operations');
    const { updateBookingPaymentWithSession } = await import('./db');
    
    const professionalProfile = await getProfessionalProfileForPayment(professionalProfileId);
    
    if (!professionalProfile) {
      // If we can't get professional profile, just return the booking as successful
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Check if professional has Stripe Connect account
    if (!professionalProfile.stripe_account_id || professionalProfile.stripe_connect_status !== 'complete') {
      // No Stripe Connect, just return the booking as successful
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Calculate payment amounts based on deposit settings
    const totalAmountInCents = Math.round(bookingResult.totalPrice * 100);
    const paymentCalculation = calculatePaymentAmounts(totalAmountInCents, professionalProfile);

    // Determine if we need Stripe checkout
    let needsStripeCheckout = false;
    let paymentType: 'full' | 'deposit' | 'setup_only' = 'full';

    if (!paymentCalculation.requiresDeposit) {
      // No deposit required - check if we need to setup payment method for future balance payment
      if (paymentCalculation.requiresBalancePayment && paymentCalculation.balancePaymentMethod === 'card') {
        needsStripeCheckout = true;
        paymentType = 'setup_only';
      }
    } else {
      // Deposit required
      needsStripeCheckout = true;
      paymentType = paymentCalculation.isFullPayment ? 'full' : 'deposit';
    }

    if (!needsStripeCheckout) {
      // No Stripe checkout needed, just return the booking as successful
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Update the existing payment record with Stripe information
    // We need to update the payment record that was created by createBooking
    // Since we can't easily modify the existing payment record structure,
    // we'll work with what we have and update the session ID later
    
    // Update the existing payment record with Stripe information
    const { updateBookingPaymentForStripe } = await import('./db');
    
    const updateResult = await updateBookingPaymentForStripe(
      bookingResult.bookingId,
      paymentCalculation
    );

    if (!updateResult.success) {
      console.error('Failed to update payment record for Stripe:', updateResult.error);
      // Still return success since the booking was created
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }
    
    // Create Stripe checkout session
    const checkoutParams = {
      bookingId: bookingResult.bookingId,
      clientId: user.id,
      professionalStripeAccountId: professionalProfile.stripe_account_id,
      amount: totalAmountInCents,
      depositAmount: paymentCalculation.depositAmount,
      balanceAmount: paymentCalculation.balanceAmount,
      paymentType,
      requiresBalancePayment: paymentCalculation.requiresBalancePayment,
      balancePaymentMethod: paymentCalculation.balancePaymentMethod,
      ...(user.email && { customerEmail: user.email }),
      metadata: {
        booking_id: bookingResult.bookingId,
        professional_profile_id: professionalProfile.id,
        total_amount: totalAmountInCents.toString(),
        service_fee: '100', // $1.00 service fee in cents
        tip_amount: ((formData.tipAmount || 0) * 100).toString()
      }
    };

    const checkoutResult = await createStripeCheckoutSession(checkoutParams);

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      console.error('Failed to create Stripe checkout session:', checkoutResult.error);
      // Still return success since the booking was created
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Update payment record with session ID
    if (checkoutResult.sessionId) {
      await updateBookingPaymentWithSession(bookingResult.bookingId, checkoutResult.sessionId);
    }

    return {
      success: true,
      bookingId: bookingResult.bookingId,
      checkoutUrl: checkoutResult.checkoutUrl,
      requiresPayment: true,
      paymentType
    };

  } catch (error) {
    console.error('Error creating booking with Stripe payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      requiresPayment: false,
      paymentType: 'full'
    };
  }
}

/**
 * Get payment calculation for a booking (for preview purposes)
 */
export async function getPaymentCalculation(
  professionalProfileId: string,
  totalAmount: number
): Promise<{
  success: boolean;
  calculation?: {
    totalAmount: number;
    depositAmount: number;
    balanceAmount: number;
    requiresDeposit: boolean;
    requiresBalancePayment: boolean;
    balancePaymentMethod: 'card' | 'cash';
    isFullPayment: boolean;
  };
  error?: string;
}> {
  try {
    const { getProfessionalProfileForPayment, calculatePaymentAmounts } = await import('./db');
    
    const professionalProfile = await getProfessionalProfileForPayment(professionalProfileId);
    
    if (!professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found'
      };
    }

    const calculation = calculatePaymentAmounts(Math.round(totalAmount * 100), professionalProfile);
    
    return {
      success: true,
      calculation: {
        totalAmount: calculation.totalAmount / 100,
        depositAmount: calculation.depositAmount / 100,
        balanceAmount: calculation.balanceAmount / 100,
        requiresDeposit: calculation.requiresDeposit,
        requiresBalancePayment: calculation.requiresBalancePayment,
        balancePaymentMethod: calculation.balancePaymentMethod,
        isFullPayment: calculation.isFullPayment
      }
    };

  } catch (error) {
    console.error('Error calculating payment amounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Cancel a booking when Stripe checkout is cancelled
 */
export async function cancelBookingForFailedCheckout(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Verify that this booking belongs to the current user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    // Only cancel if the booking is still pending (not already completed)
    if (booking.status !== 'pending') {
      return {
        success: false,
        error: 'Booking cannot be cancelled'
      };
    }

    // Delete the booking and all related records
    const { deleteBookingAndRelatedRecords } = await import('./db');
    const deleteResult = await deleteBookingAndRelatedRecords(bookingId);

    if (!deleteResult.success) {
      console.error('Failed to delete booking:', deleteResult.error);
      return {
        success: false,
        error: 'Failed to cancel booking'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error cancelling booking for failed checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check and clean up expired checkout sessions
 * This should be called periodically or when checking booking availability
 */
export async function cleanupExpiredCheckoutSessions(): Promise<{ 
  success: boolean; 
  cleanedCount?: number; 
  error?: string; 
}> {
  try {
    const supabase = await createClient();
    
    // Find booking payments with pending status and checkout sessions older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredPayments, error: fetchError } = await supabase
      .from('booking_payments')
      .select('booking_id, stripe_checkout_session_id')
      .eq('status', 'pending')
      .not('stripe_checkout_session_id', 'is', null)
      .lt('created_at', twentyFourHoursAgo);

    if (fetchError) {
      console.error('Error fetching expired payments:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!expiredPayments || expiredPayments.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    // Clean up each expired booking
    const { deleteBookingAndRelatedRecords } = await import('./db');
    let cleanedCount = 0;

    for (const payment of expiredPayments) {
      try {
        const result = await deleteBookingAndRelatedRecords(payment.booking_id);
        if (result.success) {
          cleanedCount++;
          console.log(`Cleaned up expired booking: ${payment.booking_id}`);
        } else {
          console.error(`Failed to clean up booking ${payment.booking_id}:`, result.error);
        }
      } catch (error) {
        console.error(`Error cleaning up booking ${payment.booking_id}:`, error);
      }
    }

    return { success: true, cleanedCount };

  } catch (error) {
    console.error('Error in cleanupExpiredCheckoutSessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Verify payment status for a booking (server action for success page)
 */
export async function verifyBookingPayment(
  sessionId: string,
  bookingId: string
): Promise<{
  success: boolean;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  sessionStatus?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Verify the booking belongs to the current user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Booking not found or unauthorized'
      };
    }

    // Get Stripe session details
    const { getCheckoutSession } = await import('./stripe-operations');
    const sessionResult = await getCheckoutSession(sessionId);

    if (!sessionResult.success || !sessionResult.session) {
      return {
        success: false,
        error: 'Failed to retrieve payment session'
      };
    }

    const session = sessionResult.session;

    // Check payment status
    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    let paymentIntentId: string | undefined;

    if (session.mode === 'payment') {
      if (session.payment_status === 'paid') {
        paymentStatus = 'completed';
        if (session.payment_intent && typeof session.payment_intent === 'object') {
          paymentIntentId = session.payment_intent.id;
        }
      } else if (session.payment_status === 'unpaid') {
        paymentStatus = 'failed';
      }
    } else if (session.mode === 'setup') {
      // For setup mode, we consider it successful if setup_intent succeeded
      if (session.setup_intent && typeof session.setup_intent === 'object') {
        if (session.setup_intent.status === 'succeeded') {
          paymentStatus = 'completed';
        }
      }
    }

    // Save customer information if we have it and it's not already saved
    if (session.customer && typeof session.customer === 'string') {
      const { saveCustomerFromStripeSession } = await import('./db');
      await saveCustomerFromStripeSession(user.id, session.customer);
    }

    // Update booking payment status if needed
    const { updateBookingPaymentStatus } = await import('./db');
    const updateResult = await updateBookingPaymentStatus(
      bookingId,
      paymentStatus,
      paymentIntentId
    );

    if (!updateResult.success) {
      console.error('Failed to update booking payment status:', updateResult.error);
    }

    // Update booking status to confirmed if payment was successful
    if (paymentStatus === 'completed') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
    }

    return {
      success: true,
      paymentStatus,
      sessionStatus: session.payment_status || session.status
    };

  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 