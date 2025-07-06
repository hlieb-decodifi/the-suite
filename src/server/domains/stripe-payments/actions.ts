'use server';

import { createClient } from '@/lib/supabase/server';
import { createBooking } from '@/components/templates/BookingModalTemplate/actions';
import type { BookingFormValues } from '@/components/forms/BookingForm/schema';
import type { PaymentProcessingResult } from './types';

/**
 * Create a booking with unified payment processing for both cash and card
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

    // Get payment method details
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('name, is_online')
      .eq('id', formData.paymentMethodId)
      .single();
    
    if (!paymentMethod) {
      return {
        success: false,
        error: 'Payment method not found',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // First, create the booking using the existing flow
    const [hours, minutes] = formData.timeSlot.split(':');
    const dateWithTime = new Date(formData.date);
    dateWithTime.setHours(parseInt(hours || '0', 10), parseInt(minutes || '0', 10), 0, 0);
    
    const bookingResult = await createBooking({ ...formData, dateWithTime }, professionalProfileId);
    
    if (!bookingResult.bookingId) {
      return {
        success: false,
        error: 'Failed to create booking',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Unified payment flow for both cash and card
    return await handleUnifiedPaymentFlow(
      bookingResult.bookingId,
      professionalProfileId,
      user.id,
      user.email || '',
      formData,
      bookingResult.totalPrice,
      paymentMethod.is_online
    );

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
 * Unified payment flow that handles both cash and card payments
 * NEW LOGIC:
 * - Deposits: ALWAYS charged immediately (regardless of payment method or timing)
 * - Suite fee, tips, balance: Follow scheduled workflow (setup intent if >6 days, immediate if ≤6 days)
 */
async function handleUnifiedPaymentFlow(
  bookingId: string,
  professionalProfileId: string,
  userId: string,
  userEmail: string,
  formData: BookingFormValues,
  totalPrice: number,
  isOnlinePayment: boolean
): Promise<PaymentProcessingResult> {
  try {
    // Import required functions
    const { 
      getProfessionalProfileForPayment, 
      calculatePaymentAmounts,
      updateBookingPaymentWithScheduling,
      updateBookingPaymentWithSession,
      updateBookingPaymentForStripe
    } = await import('./db');
    const { 
      schedulePaymentAuthorization, 
      createEnhancedCheckoutSession 
    } = await import('./stripe-operations');
    
    const supabase = await createClient();
    
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

    // Get appointment timing from the appointments table
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('booking_id', bookingId)
      .single();

    if (appointmentError || !appointmentData) {
      return {
        success: false,
        error: appointmentError?.message || 'Failed to fetch appointment data',
        requiresPayment: false,
        paymentType: 'full'
      };
    }

    // Calculate days until appointment using UTC timestamps
    const appointmentStartTime = new Date(appointmentData.start_time);
    const daysUntilAppointment = Math.ceil((appointmentStartTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const shouldUseSetupIntent = daysUntilAppointment > 6;

    // Get service fee for calculations
    const { getServiceFeeFromConfig } = await import('./stripe-operations');
    const serviceFee = await getServiceFeeFromConfig();

    // Update existing booking payment record with enhanced payment data
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

    // NEW LOGIC: Handle deposits separately if there's a deposit
    if (paymentCalculation.requiresDeposit && paymentCalculation.depositAmount > 0) {
      console.log(`Processing immediate deposit charge: $${paymentCalculation.depositAmount / 100}`);
      
      // Charge deposit immediately
      const depositResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
        professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: paymentCalculation.depositAmount, // Only the deposit amount
        depositAmount: paymentCalculation.depositAmount,
        balanceAmount: 0, // No balance in this session
        paymentType: 'deposit',
        requiresBalancePayment: false, // This session only handles deposit
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'immediate_deposit',
          payment_method_type: isOnlinePayment ? 'card' : 'cash',
          charge_type: 'deposit_only'
        },
        customerEmail: userEmail,
        useUncapturedPayment: false // Capture deposit immediately
      });

      if (!depositResult.success || !depositResult.checkoutUrl) {
        return {
          success: false,
          error: depositResult.error || 'Failed to create deposit payment session',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Update payment record with deposit session information
      await updateBookingPaymentWithSession(bookingId, depositResult.sessionId!);

      // Calculate remaining amount for scheduled processing (service fee + balance - deposit)
      const remainingAmount = paymentCalculation.totalAmount - paymentCalculation.depositAmount;
      
      if (remainingAmount > 0) {
        // Schedule the remaining amount (service fee + balance) for later processing
        if (shouldUseSetupIntent) {
          // For >6 days: save payment method for remaining amount
          console.log(`Scheduling remaining amount $${remainingAmount / 100} for future processing (${daysUntilAppointment} days away)`);
          
          const scheduleResult = await schedulePaymentAuthorization(
            bookingId,
            appointmentStartTime,
            new Date(appointmentData.end_time)
          );

          if (scheduleResult.success) {
            await updateBookingPaymentWithScheduling(
              bookingId,
              scheduleResult.preAuthDate!,
              scheduleResult.captureDate!,
              false,
              undefined
            );
            
            // Store the remaining amount that will be processed by cron
            const { updateBookingPaymentAmount } = await import('./db');
            await updateBookingPaymentAmount(bookingId, remainingAmount / 100);
          }
        } else {
          // For ≤6 days: the remaining amount will be processed after appointment via cron capture
          console.log(`Remaining amount $${remainingAmount / 100} will be processed via cron after appointment`);
        }
      }

      return {
        success: true,
        bookingId,
        checkoutUrl: depositResult.checkoutUrl,
        requiresPayment: true,
        paymentType: 'deposit'
      };
    }

    // NO DEPOSIT CASE: Handle full amount based on timing and payment method
    if (shouldUseSetupIntent) {
      // For appointments >6 days away: ONLY collect payment details via setup intent
      console.log(`No deposit required. Appointment is ${daysUntilAppointment} days away - using setup intent flow (${isOnlinePayment ? 'card' : 'cash'} payment)`);
      
      // Calculate payment schedule for this appointment
      const scheduleResult = await schedulePaymentAuthorization(
        bookingId,
        appointmentStartTime,
        new Date(appointmentData.end_time)
      );

      if (!scheduleResult.success) {
        return {
          success: false,
          error: scheduleResult.error || 'Failed to schedule payment',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Determine amount to be processed later by cron
      const scheduledAmount = isOnlinePayment 
        ? paymentCalculation.totalAmount  // Card: full amount
        : serviceFee; // Cash: only service fee (balance paid in cash)

      // Update payment record with scheduling information
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        false,
        undefined
      );
      
      // Update the amount field to reflect the actual amount to be processed by cron
      const { updateBookingPaymentAmount } = await import('./db');
      await updateBookingPaymentAmount(bookingId, scheduledAmount / 100);
      
      // Set status to 'pending' - indicates payment method will be collected and processed later
      const { updateBookingPaymentStatus } = await import('./db');
      await updateBookingPaymentStatus(bookingId, 'pending');

      // Create setup intent checkout session to ONLY save payment method (NO payment)
      const checkoutResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
        professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: scheduledAmount, // Amount for display purposes in setup intent
        depositAmount: 0, // No deposit in this flow
        balanceAmount: paymentCalculation.balanceAmount,
        paymentType: 'setup_only', // This creates a setup intent (NO payment)
        requiresBalancePayment: paymentCalculation.requiresBalancePayment && isOnlinePayment,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'setup_for_future_auth',
          payment_method_type: isOnlinePayment ? 'card' : 'cash',
          scheduled_amount: scheduledAmount.toString(),
          pre_auth_scheduled_for: scheduleResult.preAuthDate!.toISOString(),
          capture_scheduled_for: scheduleResult.captureDate!.toISOString()
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
      // For appointments ≤6 days away: Process payment immediately (excluding deposits which are handled above)
      console.log(`No deposit required. Appointment is ${daysUntilAppointment} days away - using immediate payment flow (${isOnlinePayment ? 'card' : 'cash'} payment)`);
      
      const immediateAmount = isOnlinePayment 
        ? paymentCalculation.totalAmount  // Card: full amount
        : serviceFee; // Cash: only service fee
      
      const checkoutResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
        professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: immediateAmount,
        depositAmount: 0, // No deposit in this flow
        balanceAmount: paymentCalculation.balanceAmount,
                 paymentType: paymentCalculation.isFullPayment ? 'full' : 'deposit',
        requiresBalancePayment: false,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: isOnlinePayment ? 'immediate_full_payment' : 'immediate_service_fee_only',
          payment_method_type: isOnlinePayment ? 'card' : 'cash'
        },
        customerEmail: userEmail,
        useUncapturedPayment: true // Create as uncaptured for capture after appointment
      });

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        return {
          success: false,
          error: checkoutResult.error || 'Failed to create immediate payment session',
          requiresPayment: false,
          paymentType: 'full'
        };
      }

      // Update payment record with session information
      await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId!);

      return {
        success: true,
        bookingId,
        checkoutUrl: checkoutResult.checkoutUrl,
        requiresPayment: true,
                 paymentType: paymentCalculation.isFullPayment ? 'full' : 'deposit'
      };
    }

  } catch (error) {
    console.error('Error in handleUnifiedPaymentFlow:', error);
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