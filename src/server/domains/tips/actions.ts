'use server';

import { updatePaymentTipAmount } from '@/server/domains/stripe-payments/db';
import { createClient } from '@/lib/supabase/server';

/**
 * Update tip amount for a booking
 * This action verifies that the user owns the booking before updating the tip
 */
export async function updateTipAction(
  bookingId: string,
  tipAmount: number
): Promise<{
  success: boolean;
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

    // Verify the user owns this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id')
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

    // Update the tip amount
    const result = await updatePaymentTipAmount(bookingId, tipAmount);

    return result;
  } catch (error) {
    console.error('Error in updateTipAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
