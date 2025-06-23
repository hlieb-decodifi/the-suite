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
      // For cash payments, the booking payment record is already correctly created
      // by the original createBooking function with status='completed' and requires_balance_payment=false
      // We just need to handle service fee collection separately
      return {
        success: true,
        bookingId: bookingResult.bookingId,
        requiresPayment: false, // No additional payment processing needed
        paymentType: 'full'
      };
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
 * Handle card payment flow with enhanced Stripe payment scheduling
 */
async function handleCardPaymentFlow(
  bookingId: string,
  professionalProfileId: string,
  userId: string,
  userEmail: string,
  formData: BookingFormValues,
  totalPrice: number
): Promise<PaymentProcessingResult> {
  try {
    // Import required functions
    const { 
      getProfessionalProfileForPayment, 
      calculatePaymentAmounts,
      updateBookingPaymentWithScheduling,
      updateBookingPaymentWithSession
    } = await import('./db');
    const { 
      schedulePaymentAuthorization, 
      createEnhancedCheckoutSession 
    } = await import('./stripe-operations');
    
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

    if (!professionalProfile.stripe_account_id) {
      return {
        success: false,
        error: 'Professional has not connected their Stripe account',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Calculate payment amounts including service fee
    const paymentCalculation = calculatePaymentAmounts(Math.round(totalPrice * 100), professionalProfile);

    // Calculate appointment timing to determine payment flow
    const appointmentDateTime = new Date(`${formData.date.toISOString().split('T')[0]} ${formData.timeSlot}`);
    const daysUntilAppointment = Math.ceil((appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    const shouldUseSetupIntent = daysUntilAppointment > 6;
    
    if (shouldUseSetupIntent) {
      // For appointments >6 days away: Use setup intent to save payment method
      console.log(`Appointment is ${daysUntilAppointment} days away - using setup intent flow`);
      
      // Update existing booking payment record with enhanced payment data
    const { updateBookingPaymentForStripe } = await import('./db');
      const paymentRecordResult = await updateBookingPaymentForStripe(
        bookingId,
      paymentCalculation
    );

      if (!paymentRecordResult.success) {
        return {
          success: false,
          error: paymentRecordResult.error || 'Failed to update payment record',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Calculate payment schedule for this appointment
      const scheduleResult = await schedulePaymentAuthorization(
        bookingId,
        appointmentDateTime,
        formData.timeSlot
      );

      if (!scheduleResult.success) {
      return {
          success: false,
          error: scheduleResult.error || 'Failed to schedule payment',
        requiresPayment: false,
        paymentType: 'full'
      };
    }
    
      // Update payment record with scheduling information
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        false, // Don't pre-auth now
        undefined // No payment intent yet
      );
      
      // Update status to pending for future processing
      const { updateBookingPaymentStatus } = await import('./db');
      await updateBookingPaymentStatus(bookingId, 'pending');

      // Create setup intent checkout session to save payment method
      const checkoutResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
      professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: paymentCalculation.totalAmount,
      depositAmount: paymentCalculation.depositAmount,
      balanceAmount: paymentCalculation.balanceAmount,
        paymentType: 'setup_only', // This creates a setup intent
      requiresBalancePayment: paymentCalculation.requiresBalancePayment,
      metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'setup_for_future_auth'
        },
        customerEmail: userEmail
      });

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        return {
          success: false,
          error: checkoutResult.error || 'Failed to create payment setup session',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Update payment record with setup session ID
      await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId!);

      return {
        success: true,
        bookingId,
        checkoutUrl: checkoutResult.checkoutUrl,
        requiresPayment: true,
        paymentType: 'setup_only'
      };
      
    } else {
      // For appointments ≤6 days away: Create uncaptured payment intent immediately
      console.log(`Appointment is ${daysUntilAppointment} days away - using immediate uncaptured payment`);
      
      // Update existing booking payment record with enhanced payment data
      const { updateBookingPaymentForStripe } = await import('./db');
      const paymentRecordResult = await updateBookingPaymentForStripe(
        bookingId,
        paymentCalculation
      );

      if (!paymentRecordResult.success) {
        return {
          success: false,
          error: paymentRecordResult.error || 'Failed to update payment record',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Calculate payment schedule for this appointment
      const scheduleResult = await schedulePaymentAuthorization(
        bookingId,
        appointmentDateTime,
        formData.timeSlot
      );

      if (!scheduleResult.success) {
        return {
          success: false,
          error: scheduleResult.error || 'Failed to schedule payment',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

      // Create checkout session with uncaptured payment
      const checkoutResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
        professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: paymentCalculation.totalAmount,
        depositAmount: paymentCalculation.depositAmount,
        balanceAmount: paymentCalculation.balanceAmount,
        paymentType: paymentCalculation.isFullPayment ? 'full' : 'deposit',
        requiresBalancePayment: paymentCalculation.requiresBalancePayment,
        useUncapturedPayment: true, // This creates uncaptured payment intent
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'immediate_uncaptured'
        },
        customerEmail: userEmail
      });

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        return {
          success: false,
          error: checkoutResult.error || 'Failed to create payment session',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Update payment record with session and scheduling information
      await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId!);
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        scheduleResult.shouldPreAuthNow || false,
        undefined // Payment intent will be set by webhook
      );

    return {
      success: true,
        bookingId,
      checkoutUrl: checkoutResult.checkoutUrl,
      requiresPayment: true,
        paymentType: paymentCalculation.isFullPayment ? 'full' : 'deposit'
    };
    }

  } catch (error) {
    console.error('Error in handleCardPaymentFlow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
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

    // Verify the booking belongs to the current user and get appointment ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        client_id,
        status
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Booking not found or unauthorized'
      };
    }

    // Only cancel if the booking is still pending payment or pending (not already completed)
    if (booking.status === 'completed') {
      return {
        success: false,
        error: 'Cannot cancel a completed booking'
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
  isSetupIntent?: boolean;
  appointmentId?: string;
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

    // Verify the booking belongs to the current user and get appointment ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        client_id,
        status
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Booking not found or unauthorized'
      };
    }

    // Get appointment ID for this booking
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

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
    let isSetupIntent = false;

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
      // For setup mode, payment method is saved but no payment taken yet
      isSetupIntent = true;
      if (session.setup_intent && typeof session.setup_intent === 'object') {
        if (session.setup_intent.status === 'succeeded') {
          paymentStatus = 'completed'; // For UI purposes - booking is confirmed
        }
      }
    }

    // Save customer information if we have it and it's not already saved
    if (session.customer && typeof session.customer === 'string') {
      const { saveCustomerFromStripeSession } = await import('./db');
      await saveCustomerFromStripeSession(user.id, session.customer);
    }

    // Update booking payment status if needed (but not for setup intents)
    if (!isSetupIntent) {
    const { updateBookingPaymentStatus } = await import('./db');
    const updateResult = await updateBookingPaymentStatus(
      bookingId,
      paymentStatus,
      paymentIntentId
    );

    if (!updateResult.success) {
      console.error('Failed to update booking payment status:', updateResult.error);
      }
    }

    // Update booking status to confirmed if payment was successful (but not for setup intents - webhook handles that)
    if (paymentStatus === 'completed' && !isSetupIntent) {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      // Note: Booking confirmation emails are sent via webhook handler for reliability
      // This prevents duplicate emails and ensures emails are sent even if user doesn't visit success page
    }

    return {
      success: true,
      paymentStatus,
      sessionStatus: session.status || 'unknown',
      isUncaptured,
      isSetupIntent,
      ...(appointment?.id && { appointmentId: appointment.id as string })
    };

  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 