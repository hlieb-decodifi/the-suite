'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createBooking } from '@/components/templates/BookingModalTemplate/actions';
import type { BookingFormValues } from '@/components/forms/BookingForm/schema';
import type { PaymentProcessingResult } from './types';
import {
  calculateCompletePaymentData,
  type CompletePaymentData,
} from './payment-calculator';
import { getProfessionalProfileForPayment } from './db';
import type { ProfessionalProfileForPayment } from './types';

/**
 * Create a booking with unified payment processing for both cash and card
 *
 * NEW APPROACH: Calculate all payment data upfront and insert booking_payments once
 */
export async function createBookingWithStripePayment(
  formData: BookingFormValues,
  professionalProfileId: string,
  clientTimezone?: string,
): Promise<PaymentProcessingResult> {
  let bookingId: string | null = null;

  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
        requiresPayment: false,
        paymentType: 'full',
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
        paymentType: 'full',
      };
    }

    // Get professional profile for payment calculation
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

    if (!professionalProfile.stripe_account_id) {
      return {
        success: false,
        error: 'Professional has not connected their Stripe account',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Create the booking (without payment record)
    const [hours, minutes] = formData.timeSlot.split(':');
    const dateWithTime = new Date(formData.date);
    dateWithTime.setHours(
      parseInt(hours || '0', 10),
      parseInt(minutes || '0', 10),
      0,
      0,
    );

    const bookingResult = await createBooking(
      { ...formData, dateWithTime },
      professionalProfileId,
      clientTimezone,
    );

    if (!bookingResult.bookingId) {
      return {
        success: false,
        error: 'Failed to create booking',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Store booking ID for cleanup on error
    bookingId = bookingResult.bookingId;

    // Calculate ALL payment data upfront (single calculation)
    const paymentData = await calculateCompletePaymentData({
      totalPrice: bookingResult.totalPrice,
      tipAmount: formData.tipAmount || 0,
      serviceFee: bookingResult.serviceFee * 100, // Convert to cents
      professionalProfile,
      appointmentStartTime: bookingResult.appointmentStartTime,
      appointmentEndTime: bookingResult.appointmentEndTime,
      isOnlinePayment: paymentMethod.is_online,
    });

    // Insert booking_payments record ONCE with complete data
    const { error: paymentError } = await adminSupabase
      .from('booking_payments')
      .insert({
        booking_id: bookingId,
        payment_method_id: formData.paymentMethodId,
        amount: paymentData.amount,
        deposit_amount: paymentData.deposit_amount,
        balance_amount: paymentData.balance_amount,
        tip_amount: paymentData.tip_amount,
        service_fee: paymentData.service_fee,
        status: paymentData.status,
        payment_type: paymentData.payment_type,
        requires_balance_payment: paymentData.requires_balance_payment,
        capture_scheduled_for: paymentData.capture_scheduled_for,
        pre_auth_scheduled_for: paymentData.pre_auth_scheduled_for,
      });

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      await cleanupFailedBooking(bookingId);
      return {
        success: false,
        error: 'Failed to create payment record',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Create Stripe checkout session (simplified, no more updates)
    const paymentResult = await createStripeCheckoutSessionForBooking(
      bookingId,
      professionalProfileId,
      user.id,
      user.email || '',
      paymentMethod.is_online,
      professionalProfile,
      paymentData,
    );

    // If payment processing failed, clean up the booking
    if (!paymentResult.success) {
      console.log(
        `Payment processing failed for booking ${bookingId}, cleaning up...`,
      );
      await cleanupFailedBooking(bookingId);
      bookingId = null; // Prevent cleanup in catch block
    }

    return paymentResult;
  } catch (error) {
    console.error('Error in createBookingWithStripePayment:', error);

    // Clean up booking if it was created but payment failed
    if (bookingId) {
      console.log(`Cleaning up failed booking ${bookingId} due to error...`);
      await cleanupFailedBooking(bookingId);
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to process booking',
      requiresPayment: false,
      paymentType: 'full',
    };
  }
}

/**
 * Clean up a failed booking and all related records
 */
async function cleanupFailedBooking(bookingId: string): Promise<void> {
  try {
    const { deleteBookingAndRelatedRecords } = await import('./db');
    const result = await deleteBookingAndRelatedRecords(bookingId);

    if (result.success) {
      console.log(`✅ Successfully cleaned up failed booking ${bookingId}`);
    } else {
      console.error(
        `❌ Failed to clean up booking ${bookingId}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(`❌ Error during booking cleanup for ${bookingId}:`, error);
  }
}

/**
 * Create Stripe checkout session based on pre-calculated payment data
 *
 * SIMPLIFIED: Only creates Stripe session and updates session ID
 * All payment calculations done before calling this function
 */
async function createStripeCheckoutSessionForBooking(
  bookingId: string,
  professionalProfileId: string,
  userId: string,
  userEmail: string,
  isOnlinePayment: boolean,
  professionalProfile: ProfessionalProfileForPayment,
  paymentData: CompletePaymentData,
): Promise<PaymentProcessingResult> {
  try {
    const { updateBookingPaymentWithSession } = await import('./db');
    const { createEnhancedCheckoutSession } = await import(
      './stripe-operations'
    );

    // Prepare metadata
    const metadata: Record<string, string> = {
      booking_id: bookingId,
      professional_profile_id: professionalProfileId,
      payment_flow: paymentData.paymentFlow,
      payment_method_type: isOnlinePayment ? 'card' : 'cash',
    };

    // Add scenario-specific metadata
    if (paymentData.stripeCheckoutType === 'setup_only') {
      if (paymentData.deposit_amount > 0) {
        // Deposit scenario
        metadata.deposit_amount = (paymentData.deposit_amount * 100).toString();
        metadata.balance_amount = (paymentData.balance_amount * 100).toString();
        metadata.professional_stripe_account_id =
          professionalProfile.stripe_account_id || '';
        metadata.capture_scheduled_for =
          paymentData.capture_scheduled_for || '';
        metadata.appointment_timing = paymentData.appointmentTiming;
      } else {
        // Scheduled payment scenario
        metadata.scheduled_amount = paymentData.stripeAmount.toString();
        metadata.pre_auth_scheduled_for =
          paymentData.pre_auth_scheduled_for || '';
        metadata.capture_scheduled_for =
          paymentData.capture_scheduled_for || '';
      }
    }

    // Determine payment type for Stripe session
    let stripePaymentType: 'full' | 'deposit' | 'setup_only';
    if (paymentData.stripeCheckoutType === 'setup_only') {
      stripePaymentType = 'setup_only';
    } else if (paymentData.deposit_amount > 0) {
      stripePaymentType = 'deposit';
    } else {
      stripePaymentType = 'full';
    }

    // Create Stripe checkout session
    const checkoutResult = await createEnhancedCheckoutSession({
      bookingId,
      clientId: userId,
      professionalStripeAccountId: professionalProfile.stripe_account_id || '',
      amount: paymentData.stripeAmount,
      depositAmount: Math.round(paymentData.deposit_amount * 100),
      balanceAmount: Math.round(paymentData.balance_amount * 100),
      paymentType: stripePaymentType,
      requiresBalancePayment: paymentData.requires_balance_payment,
      metadata,
      customerEmail: userEmail,
      useUncapturedPayment: paymentData.useUncapturedPayment,
    });

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      return {
        success: false,
        error: checkoutResult.error || 'Failed to create checkout session',
        requiresPayment: false,
        paymentType: stripePaymentType,
      };
    }

    // Update ONLY session ID (single update)
    await updateBookingPaymentWithSession(bookingId, checkoutResult.sessionId!);

    return {
      success: true,
      bookingId,
      checkoutUrl: checkoutResult.checkoutUrl,
      requiresPayment: true,
      paymentType: stripePaymentType,
    };
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create checkout session',
      requiresPayment: false,
      paymentType: 'full',
    };
  }
}

/**
 * @deprecated This function is deprecated and will be removed in a future version.
 * Use the new createBookingWithStripePayment flow which calculates all payment data upfront.
 *
 * Unified payment flow that handles both cash and card payments
 * NEW LOGIC:
 * - Deposits: ALWAYS charged immediately (regardless of payment method or timing)
 * - Suite fee, tips, balance: Follow scheduled workflow (setup intent if >6 days, immediate if ≤6 days)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleUnifiedPaymentFlow(
  bookingId: string,
  professionalProfileId: string,
  userId: string,
  userEmail: string,
  formData: BookingFormValues,
  totalPrice: number,
  isOnlinePayment: boolean,
): Promise<PaymentProcessingResult> {
  try {
    // Import required functions
    const {
      getProfessionalProfileForPayment,
      calculatePaymentAmounts,
      updateBookingPaymentWithScheduling,
      updateBookingPaymentWithSession,
      updateBookingPaymentForStripe,
    } = await import('./db');
    const { schedulePaymentAuthorization, createEnhancedCheckoutSession } =
      await import('./stripe-operations');

    const supabase = await createClient();

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

    if (!professionalProfile.stripe_account_id) {
      return {
        success: false,
        error: 'Professional has not connected their Stripe account',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // Calculate service amount and tip amount separately for proper deposit calculation
    const totalAmountCents = Math.round(totalPrice * 100);
    const tipAmountCents = Math.round((formData.tipAmount || 0) * 100);
    const { getServiceFeeFromConfig } = await import(
      '@/server/lib/service-fee'
    );
    const serviceFeeResult = await getServiceFeeFromConfig();
    const serviceAmountCents =
      totalAmountCents - serviceFeeResult - tipAmountCents;

    // Calculate payment amounts with proper service/tip separation
    const paymentCalculation = await calculatePaymentAmounts(
      totalAmountCents,
      professionalProfile,
      serviceAmountCents,
      tipAmountCents,
    );

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
        paymentType: 'full',
      };
    }

    // Calculate days until appointment using UTC timestamps
    const appointmentStartTime = new Date(appointmentData.start_time);
    const daysUntilAppointment = Math.ceil(
      (appointmentStartTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const shouldUseSetupIntent = daysUntilAppointment > 6;

    // Service fee already imported above
    const serviceFee = serviceFeeResult;

    // Update existing booking payment record with enhanced payment data
    const paymentRecordResult = await updateBookingPaymentForStripe(
      bookingId,
      paymentCalculation,
    );

    if (!paymentRecordResult.success) {
      return {
        success: false,
        error: paymentRecordResult.error || 'Failed to update payment record',
        requiresPayment: false,
        paymentType: 'full',
      };
    }

    // NEW LOGIC: Handle deposits using setup intent + immediate charge + uncaptured balance
    if (
      paymentCalculation.requiresDeposit &&
      paymentCalculation.depositAmount > 0
    ) {
      console.log(
        `Processing deposit setup intent: Deposit $${paymentCalculation.depositAmount / 100}, Balance $${paymentCalculation.balanceAmount / 100}`,
      );

      // Calculate payment schedule for balance capture
      const scheduleResult = await schedulePaymentAuthorization(
        bookingId,
        appointmentStartTime,
        new Date(appointmentData.end_time),
      );

      if (!scheduleResult.success) {
        return {
          success: false,
          error: scheduleResult.error || 'Failed to schedule balance payment',
          requiresPayment: false,
          paymentType: 'full',
        };
      }

      // Update payment record with schedule
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        scheduleResult.shouldPreAuthNow!, // Use the actual shouldPreAuthNow from schedule calculation
        undefined,
      );

      // Create setup intent that will trigger immediate deposit charge + uncaptured balance creation
      const setupResult = await createEnhancedCheckoutSession({
        bookingId,
        clientId: userId,
        professionalStripeAccountId: professionalProfile.stripe_account_id,
        amount: paymentCalculation.totalAmount, // Full amount for display
        depositAmount: paymentCalculation.depositAmount,
        balanceAmount: paymentCalculation.balanceAmount,
        paymentType: 'setup_only', // This creates a setup intent
        requiresBalancePayment: true,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'setup_for_deposit_and_balance',
          payment_method_type: isOnlinePayment ? 'card' : 'cash',
          deposit_amount: paymentCalculation.depositAmount.toString(),
          balance_amount: paymentCalculation.balanceAmount.toString(),
          professional_stripe_account_id: professionalProfile.stripe_account_id,
          capture_scheduled_for: scheduleResult.captureDate!.toISOString(),
          appointment_timing: scheduleResult.shouldPreAuthNow
            ? 'immediate'
            : 'scheduled',
        },
        customerEmail: userEmail,
      });

      if (!setupResult.success || !setupResult.checkoutUrl) {
        return {
          success: false,
          error: setupResult.error || 'Failed to create deposit setup session',
          requiresPayment: false,
          paymentType: 'full',
        };
      }

      // Update payment record with setup session information
      await updateBookingPaymentWithSession(bookingId, setupResult.sessionId!);

      return {
        success: true,
        bookingId,
        checkoutUrl: setupResult.checkoutUrl,
        requiresPayment: true,
        paymentType: 'deposit',
      };
    }

    // NO DEPOSIT CASE: Handle full amount based on timing and payment method
    if (shouldUseSetupIntent) {
      // For appointments >6 days away: ONLY collect payment details via setup intent
      console.log(
        `No deposit required. Appointment is ${daysUntilAppointment} days away - using setup intent flow (${isOnlinePayment ? 'card' : 'cash'} payment)`,
      );

      // Calculate payment schedule for this appointment
      const scheduleResult = await schedulePaymentAuthorization(
        bookingId,
        appointmentStartTime,
        new Date(appointmentData.end_time),
      );

      if (!scheduleResult.success) {
        return {
          success: false,
          error: scheduleResult.error || 'Failed to schedule payment',
          requiresPayment: false,
          paymentType: 'full',
        };
      }

      // Determine amount to be processed later by cron
      const scheduledAmount = isOnlinePayment
        ? paymentCalculation.totalAmount // Card: full amount
        : serviceFee; // Cash: only service fee (balance paid in cash)

      // Update payment record with scheduling information
      await updateBookingPaymentWithScheduling(
        bookingId,
        scheduleResult.preAuthDate!,
        scheduleResult.captureDate!,
        false,
        undefined,
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
        requiresBalancePayment:
          paymentCalculation.requiresBalancePayment && isOnlinePayment,
        metadata: {
          booking_id: bookingId,
          professional_profile_id: professionalProfileId,
          payment_flow: 'setup_for_future_auth',
          payment_method_type: isOnlinePayment ? 'card' : 'cash',
          scheduled_amount: scheduledAmount.toString(),
          pre_auth_scheduled_for: scheduleResult.preAuthDate!.toISOString(),
          capture_scheduled_for: scheduleResult.captureDate!.toISOString(),
        },
        customerEmail: userEmail,
      });

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        return {
          success: false,
          error:
            checkoutResult.error || 'Failed to create payment setup session',
          requiresPayment: false,
          paymentType: 'full',
        };
      }

      // Update payment record with setup session ID
      await updateBookingPaymentWithSession(
        bookingId,
        checkoutResult.sessionId!,
      );

      return {
        success: true,
        bookingId,
        checkoutUrl: checkoutResult.checkoutUrl,
        requiresPayment: true,
        paymentType: 'setup_only',
      };
    } else {
      // For appointments ≤6 days away: Process payment immediately (excluding deposits which are handled above)
      console.log(
        `No deposit required. Appointment is ${daysUntilAppointment} days away - using immediate payment flow (${isOnlinePayment ? 'card' : 'cash'} payment)`,
      );

      const immediateAmount = isOnlinePayment
        ? paymentCalculation.totalAmount // Card: full amount
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
          payment_flow: isOnlinePayment
            ? 'immediate_full_payment'
            : 'immediate_service_fee_only',
          payment_method_type: isOnlinePayment ? 'card' : 'cash',
        },
        customerEmail: userEmail,
        useUncapturedPayment: true, // Create as uncaptured for capture after appointment
      });

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        return {
          success: false,
          error:
            checkoutResult.error ||
            'Failed to create immediate payment session',
          requiresPayment: false,
          paymentType: 'full',
        };
      }

      // Update payment record with session information
      await updateBookingPaymentWithSession(
        bookingId,
        checkoutResult.sessionId!,
      );

      return {
        success: true,
        bookingId,
        checkoutUrl: checkoutResult.checkoutUrl,
        requiresPayment: true,
        paymentType: paymentCalculation.isFullPayment ? 'full' : 'deposit',
      };
    }
  } catch (error) {
    console.error('Error in handleUnifiedPaymentFlow:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to process payment',
      requiresPayment: false,
      paymentType: 'full',
    };
  }
}

/**
 * Get payment calculation for a booking (for preview purposes)
 */
export async function getPaymentCalculation(
  professionalProfileId: string,
  totalAmount: number,
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
    const { getProfessionalProfileForPayment, calculatePaymentAmounts } =
      await import('./db');

    const professionalProfile = await getProfessionalProfileForPayment(
      professionalProfileId,
    );

    if (!professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found',
      };
    }

    const calculation = await calculatePaymentAmounts(
      Math.round(totalAmount * 100),
      professionalProfile,
    );

    return {
      success: true,
      calculation: {
        totalAmount: calculation.totalAmount / 100,
        depositAmount: calculation.depositAmount / 100,
        balanceAmount: calculation.balanceAmount / 100,
        requiresDeposit: calculation.requiresDeposit,
        requiresBalancePayment: calculation.requiresBalancePayment,

        isFullPayment: calculation.isFullPayment,
      },
    };
  } catch (error) {
    console.error('Error calculating payment amounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Cancel a booking when Stripe checkout is cancelled
 */
export async function cancelBookingForFailedCheckout(
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Verify the booking belongs to the current user and get appointment ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        client_id,
        status
      `,
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Booking not found or unauthorized',
      };
    }

    // Only cancel if the booking is still pending payment or pending (not already completed)
    if (booking.status === 'completed') {
      return {
        success: false,
        error: 'Cannot cancel a completed booking',
      };
    }

    // Delete the booking and all related records
    const { deleteBookingAndRelatedRecords } = await import('./db');
    const deleteResult = await deleteBookingAndRelatedRecords(bookingId);

    if (!deleteResult.success) {
      console.error('Failed to delete booking:', deleteResult.error);
      return {
        success: false,
        error: 'Failed to cancel booking',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking for failed checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

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
          console.error(
            `Failed to clean up booking ${payment.booking_id}:`,
            result.error,
          );
        }
      } catch (error) {
        console.error(
          `Error cleaning up booking ${payment.booking_id}:`,
          error,
        );
      }
    }

    return { success: true, cleanedCount };
  } catch (error) {
    console.error('Error in cleanupExpiredCheckoutSessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Verify payment status for a booking (server action for success page)
 */
export async function verifyBookingPayment(
  sessionId: string,
  bookingId: string,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Verify the booking belongs to the current user and get appointment ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        client_id,
        status
      `,
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Booking not found or unauthorized',
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
        error: 'Failed to retrieve payment session',
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
        if (
          session.payment_intent &&
          typeof session.payment_intent === 'object'
        ) {
          paymentIntentId = session.payment_intent.id;
        }
      } else if (session.payment_status === 'unpaid') {
        paymentStatus = 'failed';
      } else if (session.payment_status === 'no_payment_required') {
        // Handle case where no payment is required (e.g., free services)
        paymentStatus = 'completed';
      }

      // For uncaptured payments, check the payment intent status
      if (
        session.payment_intent &&
        typeof session.payment_intent === 'object'
      ) {
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
        } else if (
          paymentIntent.status === 'requires_action' ||
          paymentIntent.status === 'requires_confirmation'
        ) {
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
        paymentIntentId,
      );

      if (!updateResult.success) {
        console.error(
          'Failed to update booking payment status:',
          updateResult.error,
        );
      }
    }

    return {
      success: true,
      paymentStatus,
      sessionStatus: session.status || 'unknown',
      isUncaptured,
      isSetupIntent,
      ...(appointment?.id && { appointmentId: appointment.id as string }),
    };
  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
