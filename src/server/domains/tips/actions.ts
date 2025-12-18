'use server';

import { updatePaymentTipAmount } from '@/server/domains/stripe-payments/db';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';
import { headers } from 'next/headers';

/**
 * Update tip amount for a booking
 * This action verifies that the user owns the booking before updating the tip
 */
export async function updateTipAction(
  bookingId: string,
  tipAmount: number,
): Promise<{
  success: boolean;
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
    if (tipAmount < 0) {
      return {
        success: false,
        error: 'Invalid tip amount',
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
        error: 'Booking not found',
      };
    }

    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Update the tip amount
    const result = await updatePaymentTipAmount(bookingId, tipAmount);

    return result;
  } catch (error) {
    console.error('Error in updateTipAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new post-appointment tip with Stripe checkout
 * This action creates a separate tip payment after appointment completion
 */
export async function createPostAppointmentTipAction(
  bookingId: string,
  tipAmount: number,
): Promise<{
  success: boolean;
  checkoutUrl?: string | null;
  error?: string;
}> {
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
      };
    }

    // Validate tipAmount
    if (tipAmount <= 0) {
      return {
        success: false,
        error: 'Invalid tip amount',
      };
    }

    // Verify the user owns this booking and get professional details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        client_id,
        professional_profile_id,
        professional_profiles!inner(
          user_id
        ),
        appointments(
          id,
          start_time,
          end_time,
          status
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

    // Derive client_id and professional_id from database (not parameters)
    const clientId = booking.client_id;
    const professionalId = booking.professional_profiles?.user_id;

    if (!professionalId) {
      return {
        success: false,
        error: 'Professional not found for this booking',
      };
    }

    // Verify the user owns this booking
    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check if appointment is completed (check if past end time and not cancelled)
    const appointment = booking.appointments[0];
    if (!appointment || appointment.status === 'cancelled') {
      return {
        success: false,
        error: 'Appointment not found or cancelled',
      };
    }

    // Check if appointment has ended (simple time check)
    const appointmentEndTime = new Date(appointment.end_time);
    const now = new Date();
    if (now <= appointmentEndTime) {
      return {
        success: false,
        error: 'Appointment must be completed to add tips',
      };
    }

    // Get professional's Stripe account ID
    const { data: stripeConnect, error: stripeError } = await adminSupabase
      .from('professional_stripe_connect')
      .select('stripe_account_id')
      .eq('professional_profile_id', booking.professional_profile_id)
      .single();

    if (stripeError || !stripeConnect?.stripe_account_id) {
      return {
        success: false,
        error: 'Professional payment setup not configured',
      };
    }

    // Get application origin for redirect URLs
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    // Get the client's Stripe customer ID
    const { data: customer, error: customerError } = await adminSupabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', clientId)
      .single();

    if (customerError || !customer?.stripe_customer_id) {
      return {
        success: false,
        error:
          'Customer payment setup not found. Please complete a booking first to set up payments.',
      };
    }

    // Create tip record in database first
    const { data: tipRecord, error: tipError } = await adminSupabase
      .from('tips')
      .insert({
        booking_id: bookingId,
        client_id: clientId,
        professional_id: professionalId,
        amount: tipAmount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (tipError || !tipRecord) {
      return {
        success: false,
        error: 'Failed to create tip record',
      };
    }

    try {
      // Create Stripe checkout session for the tip
      const session = await stripe.checkout.sessions.create({
        customer: customer.stripe_customer_id, // Use existing customer
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Tip',
                description: `Tip for professional services`,
              },
              unit_amount: Math.round(tipAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/bookings/${appointment.id}?tip_success=true`,
        cancel_url: `${origin}/bookings/${appointment.id}?tip_cancelled=true`,
        payment_intent_data: {
          transfer_data: {
            destination: stripeConnect.stripe_account_id,
          },
          metadata: {
            tip_id: tipRecord.id,
            booking_id: bookingId,
            client_id: clientId,
            professional_id: professionalId,
            payment_type: 'tip',
          },
        },
        metadata: {
          tip_id: tipRecord.id,
          booking_id: bookingId,
          payment_type: 'tip',
        },
      });

      // Update tip record with Stripe session info
      await adminSupabase
        .from('tips')
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', tipRecord.id);

      return {
        success: true,
        checkoutUrl: session.url,
      };
    } catch (stripeError) {
      // If Stripe fails, clean up the tip record
      await adminSupabase.from('tips').delete().eq('id', tipRecord.id);

      throw stripeError;
    }
  } catch (error) {
    console.error('Error in createPostAppointmentTipAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
