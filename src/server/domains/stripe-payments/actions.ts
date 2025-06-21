'use server';

import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@/components/templates/BookingModalTemplate/actions';
import type { BookingFormValues } from '@/components/forms/BookingForm/schema';
import type { PaymentProcessingResult } from './types';

/**
 * Create a booking with enhanced Stripe payment processing
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

    // If payment method is cash, handle service fee collection
    if (paymentMethod && !paymentMethod.is_online) {
      return await handleCashPaymentFlow(
        bookingResult.bookingId,
        user.id,
        user.email || '',
        formData,
        bookingResult.totalPrice
      );
    }

    // For Credit Card payments, handle enhanced Stripe flow
    if (paymentMethod?.is_online && paymentMethod.name === 'Credit Card') {
      return await handleCardPaymentFlow(
        bookingResult.bookingId,
        professionalProfileId,
        user.id,
        user.email || '',
        formData,
        bookingResult.totalPrice
      );
    }

    // Default: no payment processing needed
    return {
      success: true,
      bookingId: bookingResult.bookingId,
      requiresPayment: false,
      paymentType: 'full'
    };

  } catch (error) {
    console.error('Error in createBookingWithStripePayment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process booking',
      requiresPayment: false,
      paymentType: 'full'
    };
  }
}

/**
 * Handle cash payment flow - collect service fee only
 */
async function handleCashPaymentFlow(
  bookingId: string,
  clientId: string,
  clientEmail: string,
  formData: BookingFormValues,
  totalPrice: number
): Promise<PaymentProcessingResult> {
  try {
    const { createEnhancedCheckoutSession } = await import('./stripe-operations');
    
    // Create checkout session for service fee only
    const checkoutParams = {
      bookingId,
      clientId,
      professionalStripeAccountId: 'acct_platform', // Use platform account for service fees
      amount: 0, // No main payment amount
      paymentType: 'full' as const,
      requiresBalancePayment: false,
      customerEmail: clientEmail,
      isServiceFeeOnly: true,
      metadata: {
        booking_id: bookingId,
        payment_method: 'cash',
        total_amount: (totalPrice * 100).toString(),
        service_fee_only: 'true',
        tip_amount: ((formData.tipAmount || 0) * 100).toString()
      }
    };

    const checkoutResult = await createEnhancedCheckoutSession(checkoutParams);

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      console.error('Failed to create service fee checkout session:', checkoutResult.error);
      return {
        success: true, // Still successful booking, just no service fee collection
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    return {
      success: true,
      bookingId,
      checkoutUrl: checkoutResult.checkoutUrl,
      requiresPayment: true,
      paymentType: 'full'
    };

  } catch (error) {
    console.error('Error handling cash payment flow:', error);
    return {
      success: true, // Still return successful booking
      bookingId,
      requiresPayment: false,
      paymentType: 'full'
    };
  }
}

/**
 * Handle card payment flow with uncaptured payments and scheduling
 */
async function handleCardPaymentFlow(
  bookingId: string,
  professionalProfileId: string,
  clientId: string,
  clientEmail: string,
  formData: BookingFormValues,
  totalPrice: number
): Promise<PaymentProcessingResult> {
  try {
    const { 
      getProfessionalProfileForPayment, 
      calculatePaymentAmounts,
      updateBookingPaymentWithScheduling 
    } = await import('./db');
    const { 
      schedulePaymentAuthorization, 
      createEnhancedCheckoutSession 
    } = await import('./stripe-operations');
    
    const professionalProfile = await getProfessionalProfileForPayment(professionalProfileId);
    
    if (!professionalProfile) {
      return {
        success: true,
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Check if professional has Stripe Connect account
    if (!professionalProfile.stripe_account_id || professionalProfile.stripe_connect_status !== 'complete') {
      return {
        success: true,
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Calculate payment amounts with enhanced validation
    const totalAmountInCents = Math.round(totalPrice * 100);
    const paymentCalculation = calculatePaymentAmounts(totalAmountInCents, professionalProfile);

    // Get appointment details for scheduling
    const supabase = await createClient();
    const { data: appointment } = await supabase
      .from('appointments')
      .select('date, start_time')
      .eq('booking_id', bookingId)
      .single();

    if (!appointment) {
      throw new Error('Failed to get appointment details for payment scheduling');
    }

    // Calculate payment schedule
    const scheduleResult = await schedulePaymentAuthorization(
      bookingId,
      new Date(appointment.date),
      appointment.start_time
    );

    if (!scheduleResult.success) {
      throw new Error(scheduleResult.error || 'Failed to calculate payment schedule');
    }

    // Determine payment type and checkout configuration
    let paymentType: 'full' | 'deposit' | 'setup_only' = 'full';
    let needsCheckout = false;
    let useUncapturedPayment = false;

    if (!paymentCalculation.requiresDeposit) {
      // No deposit required - schedule for later capture
      needsCheckout = true;
      useUncapturedPayment = true;
      paymentType = 'full';
    } else {
      // Deposit required
      needsCheckout = true;
      paymentType = paymentCalculation.isFullPayment ? 'full' : 'deposit';
      useUncapturedPayment = !paymentCalculation.isFullPayment; // Only uncaptured if balance remaining
    }

    if (!needsCheckout) {
      // Update payment scheduling information
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        scheduleResult.shouldPreAuthNow!
      );

      return {
        success: true,
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }
    
    // Create enhanced checkout session
    const checkoutParams = {
      bookingId,
      clientId,
      professionalStripeAccountId: professionalProfile.stripe_account_id,
      amount: totalAmountInCents,
      depositAmount: paymentCalculation.depositAmount,
      balanceAmount: paymentCalculation.balanceAmount,
      paymentType,
      requiresBalancePayment: paymentCalculation.requiresBalancePayment,
      customerEmail: clientEmail,
      useUncapturedPayment,
      metadata: {
        booking_id: bookingId,
        professional_profile_id: professionalProfile.id,
        total_amount: totalAmountInCents.toString(),
        service_fee: '100', // $1.00 service fee in cents
        tip_amount: ((formData.tipAmount || 0) * 100).toString(),
        pre_auth_scheduled: scheduleResult.preAuthDate!.toISOString(),
        capture_scheduled: scheduleResult.captureDate!.toISOString(),
        should_pre_auth_now: scheduleResult.shouldPreAuthNow!.toString()
      }
    };

    const checkoutResult = await createEnhancedCheckoutSession(checkoutParams);

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      console.error('Failed to create enhanced checkout session:', checkoutResult.error);
      return {
        success: true,
        bookingId,
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Update payment record with scheduling information
    await updateBookingPaymentWithScheduling(
      bookingId,
      scheduleResult.preAuthDate!,
      scheduleResult.captureDate!,
      scheduleResult.shouldPreAuthNow!
    );

    // Update payment record with session ID
    const { updateBookingPaymentWithSession } = await import('./db');
    if (checkoutResult.sessionId) {
      await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId);
    }

    return {
      success: true,
      bookingId,
      checkoutUrl: checkoutResult.checkoutUrl,
      requiresPayment: true,
      paymentType
    };

  } catch (error) {
    console.error('Error handling card payment flow:', error);
    return {
      success: true, // Still return successful booking
      bookingId,
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

    // Only cancel if the booking is still pending payment or pending (not already completed)
    if (booking.status !== 'pending' && booking.status !== 'pending_payment') {
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
  isUncaptured?: boolean;
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
    let isUncaptured = false;

    if (session.mode === 'payment') {
      if (session.payment_status === 'paid') {
        paymentStatus = 'completed';
        if (session.payment_intent && typeof session.payment_intent === 'object') {
          paymentIntentId = session.payment_intent.id;
        }
      } else if (session.payment_status === 'unpaid') {
        paymentStatus = 'failed';
      } else if (session.payment_status === 'no_payment_required') {
        // Handle case where no payment is required (e.g., free services)
        paymentStatus = 'completed';
      }
      
      // For uncaptured payments, check the payment intent status
      if (session.payment_intent && typeof session.payment_intent === 'object') {
        paymentIntentId = session.payment_intent.id;
        const paymentIntent = session.payment_intent;
        
        // Uncaptured payments will have status 'requires_capture' which should be treated as successful
        if (paymentIntent.status === 'requires_capture') {
          paymentStatus = 'completed';
          isUncaptured = true;
        } else if (paymentIntent.status === 'succeeded') {
          paymentStatus = 'completed';
        } else if (paymentIntent.status === 'canceled') {
          paymentStatus = 'failed';
        } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
          // These statuses indicate the payment is still in progress but not failed
          paymentStatus = 'pending';
        }
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
      sessionStatus: session.payment_status || session.status,
      isUncaptured
    };

  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 