'use server';

import { createClient } from '@/lib/supabase/server';
import { updatePaymentTipAmount } from './db';

/**
 * Process balance payment with tip amount
 */
/**
 * Process tip for cash payments (no balance capture needed)
 */
export async function processCashPaymentTip(
  bookingId: string,
  tipAmount: number,
): Promise<{
  success: boolean;
  tipProcessed?: number;
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

    // Validate tipAmount
    if (tipAmount <= 0) {
      return {
        success: false,
        error: 'Invalid tip amount',
      };
    }

    // Get booking details to verify ownership and check payment status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        client_id,
        booking_payments (
          id,
          status,
          amount,
          requires_balance_payment,
          payment_methods (
            name,
            is_online
          )
        )
      `,
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    // Verify the user owns this booking
    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const payment = booking.booking_payments as unknown as {
      id: string;
      status: string;
      amount: number;
      requires_balance_payment: boolean;
      payment_methods: { name: string; is_online: boolean };
    };

    // Verify this is a cash payment
    if (
      !payment ||
      payment.status !== 'completed' ||
      payment.requires_balance_payment ||
      payment.payment_methods.is_online
    ) {
      return {
        success: false,
        error: 'This booking is not eligible for cash tip processing',
      };
    }

    // Update tip amount in database
    const tipUpdateResult = await updatePaymentTipAmount(bookingId, tipAmount);
    if (!tipUpdateResult.success) {
      return {
        success: false,
        error: 'Failed to update tip amount',
      };
    }

    // For cash payments, we would create a separate tip payment to the professional
    // This might involve creating a Stripe transfer or payment to the professional's account
    // For now, we'll just record the tip and send notification emails

    // Send tip notification emails
    try {
      const { sendPaymentConfirmationEmails } = await import(
        './email-notifications'
      );
      const emailResult = await sendPaymentConfirmationEmails(bookingId);

      if (!emailResult.success) {
        console.error(
          `Failed to send tip confirmation emails: ${emailResult.error}`,
        );
        // Don't fail the tip processing for email issues
      }
    } catch (emailError) {
      console.error('Error sending tip confirmation emails:', emailError);
      // Don't fail the tip processing for email issues
    }

    return {
      success: true,
      tipProcessed: tipAmount,
    };
  } catch (error) {
    console.error('Error in processCashPaymentTip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processBalancePayment(
  bookingId: string,
  tipAmount: number
): Promise<{
  success: boolean;
  capturedAmount?: number;
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

    // Validate tipAmount
    if (tipAmount < 0) {
      return {
        success: false,
        error: 'Invalid tip amount'
      };
    }

    // Get booking details to verify ownership and get payment info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        booking_payments (
          id,
          stripe_payment_intent_id,
          balance_amount,
          tip_amount,
          status
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Verify the user owns this booking
    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    // Check if booking has a payment record
    if (!booking.booking_payments) {
      return {
        success: false,
        error: 'No payment record found'
      };
    }

    const payment = booking.booking_payments;

    // Check if payment is already captured
    if (payment.status === 'completed') {
      return {
        success: false,
        error: 'Payment already processed'
      };
    }

    // Check if payment intent exists
    if (!payment.stripe_payment_intent_id) {
      return {
        success: false,
        error: 'No payment intent found',
      };
    }

    // For balance payments, we only update the tip amount in the database.
    // The existing cron job will handle capturing the payment later.
    const tipUpdateResult = await updatePaymentTipAmount(bookingId, tipAmount);

    if (!tipUpdateResult.success) {
      return {
        success: false,
        error: 'Failed to update tip amount',
      };
    }

    return {
      success: true,
      capturedAmount: payment.balance_amount + tipAmount, // Return the intended amount
    };
  } catch (error) {
    console.error('Error in processBalancePayment:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
} 