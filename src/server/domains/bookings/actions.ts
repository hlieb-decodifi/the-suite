'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { stripe } from '@/lib/stripe/server';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import {
  createBookingCancellationClientEmail,
  createBookingCancellationProfessionalEmail,
} from '@/lib/email/templates';

// Create admin client for operations that need elevated permissions
function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Cancel a booking
 */
export async function cancelBookingAction(
  bookingId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get booking with all related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        appointments!inner(*),
        professional_profiles!inner(
          cancellation_policy_enabled,
          users!inner(id, first_name, last_name)
        ),
        clients:users!client_id(id, first_name, last_name, client_profiles(*)),
        booking_services(
          id,
          price,
          services(name)
        ),
        booking_payments(
          id,
          amount,
          tip_amount,
          status,
          stripe_payment_intent_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    const appointment = booking.appointments;
    const professionalProfile = booking.professional_profiles;
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;
    const payment = booking.booking_payments;

    // Check authorization
    const isProfessional = user.id === professionalUser.id;
    const isClient = user.id === clientUser.id;

    if (!isProfessional && !isClient) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if already cancelled
    if (booking.status === 'cancelled' || appointment.status === 'cancelled') {
      return { success: false, error: 'Booking already cancelled' };
    }

    // Update booking status
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateBookingError) {
      return { success: false, error: 'Failed to update booking status' };
    }

    const { error: updateAppointmentError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (updateAppointmentError) {
      return { success: false, error: 'Failed to update appointment status' };
    }

    // Update payment status and clear scheduled jobs if payment exists
    if (payment) {
      // Cancel uncaptured payment intent in Stripe if it exists
      if (payment.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
          
          // Only cancel if payment intent is in a cancelable state
          if (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'requires_confirmation') {
            await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
            console.log(`Cancelled Stripe payment intent: ${payment.stripe_payment_intent_id}`);
          } else {
            console.log(`Payment intent ${payment.stripe_payment_intent_id} is in status ${paymentIntent.status}, cannot cancel`);
          }
        } catch (stripeError) {
          console.error('Failed to cancel Stripe payment intent:', stripeError);
          // Don't fail the entire cancellation for Stripe errors
        }
      }

      const { error: updatePaymentError } = await supabase
        .from('booking_payments')
        .update({
          status: 'refunded',
          pre_auth_scheduled_for: null,
          capture_scheduled_for: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updatePaymentError) {
        console.error('Failed to update payment status:', updatePaymentError);
      }
    }

    // Send email notifications
    await sendCancellationEmails(booking, cancellationReason);

    // Revalidate the booking detail page to ensure fresh data
    revalidatePath(`/bookings/${appointment.id}`);

    return { success: true };

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a user can cancel a booking
 */
export async function canCancelBookingAction(
  bookingId: string
): Promise<{ canCancel: boolean; reason?: string }> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canCancel: false, reason: 'Unauthorized' };
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        appointments!inner(*),
        professional_profiles!inner(
          cancellation_policy_enabled,
          users!inner(id)
        ),
        clients:users!client_id(id)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { canCancel: false, reason: 'Booking not found' };
    }

    const appointment = booking.appointments;
    const professionalProfile = booking.professional_profiles;
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;

    // Check authorization
    const isProfessional = user.id === professionalUser.id;
    const isClient = user.id === clientUser.id;

    if (!isProfessional && !isClient) {
      return { canCancel: false, reason: 'Unauthorized' };
    }

    // Check if already cancelled
    if (booking.status === 'cancelled' || appointment.status === 'cancelled') {
      return { canCancel: false, reason: 'Already cancelled' };
    }

    // Check if completed
    if (booking.status === 'completed' || appointment.status === 'completed') {
      return { canCancel: false, reason: 'Cannot cancel completed booking' };
    }

    // For now, if professional doesn't have cancellation policy enabled,
    // both client and professional can cancel without restrictions
    if (!professionalProfile.cancellation_policy_enabled) {
      return { canCancel: true };
    }

    // TODO: Implement cancellation policy logic for when it's enabled
    
    return { canCancel: true };

  } catch (error) {
    console.error('Error checking cancellation eligibility:', error);
    return { canCancel: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Send cancellation email notifications
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendCancellationEmails(booking: any, cancellationReason: string) {
  const adminSupabase = createSupabaseAdminClient();

  try {
    const appointment = booking.appointments;
    const professionalProfile = booking.professional_profiles;
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;
    const clientProfile = clientUser.client_profiles;
    const bookingServices = booking.booking_services || [];
    const payment = booking.booking_payments;

    // Get user emails using admin client
    const { data: clientAuth } = await adminSupabase.auth.admin.getUserById(clientUser.id);
    const { data: professionalAuth } = await adminSupabase.auth.admin.getUserById(professionalUser.id);

    if (!clientAuth.user?.email || !professionalAuth.user?.email) {
      console.error('Failed to get user emails for cancellation notifications');
      return;
    }

    // Format date and time
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const appointmentTime = new Date(`1970-01-01T${appointment.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Prepare services data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const servicesData = bookingServices.map((bs: any) => ({
      name: bs.services?.name || 'Service',
      price: bs.price || 0
    }));

    // Prepare refund info if payment exists
    const refundInfo = payment ? {
      originalAmount: payment.amount + (payment.tip_amount || 0),
      refundAmount: payment.amount + (payment.tip_amount || 0), // Full refund for cancellations
      status: 'Processing'
    } : undefined;

    // Send client email
    const clientEmail = createBookingCancellationClientEmail(
      clientAuth.user.email,
      `${clientUser.first_name} ${clientUser.last_name}`,
      {
        bookingId: booking.id,
        appointmentId: appointment.id,
        appointmentDate,
        appointmentTime,
        professionalName: `${professionalUser.first_name} ${professionalUser.last_name}`,
        cancellationReason,
        services: servicesData,
        ...(refundInfo && { refundInfo })
      }
    );

    // Send professional email
    const professionalEmail = createBookingCancellationProfessionalEmail(
      professionalAuth.user.email,
      `${professionalUser.first_name} ${professionalUser.last_name}`,
      {
        bookingId: booking.id,
        appointmentId: appointment.id,
        appointmentDate,
        appointmentTime,
        clientName: `${clientUser.first_name} ${clientUser.last_name}`,
        clientPhone: clientProfile?.phone_number,
        cancellationReason,
        services: servicesData,
        ...(refundInfo && { refundInfo })
      }
    );

    // Send emails
    await Promise.allSettled([
      sendEmail(clientEmail),
      sendEmail(professionalEmail)
    ]);

    console.log('Cancellation notification emails sent successfully');

  } catch (error) {
    console.error('Error sending cancellation notifications:', error);
  }
} 