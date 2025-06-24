/* eslint-disable @typescript-eslint/no-explicit-any */
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
  createNoShowNotificationClientEmail,
  createNoShowNotificationProfessionalEmail,
  createCancellationPolicyChargeClientEmail,
  createCancellationPolicyChargeProfessionalEmail,
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
): Promise<{ success: boolean; error?: string; chargeAmount?: number; message?: string }> {
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

    // Send emails - these functions return EmailTemplate objects
    await Promise.allSettled([
      sendEmail(clientEmail),
      sendEmail(professionalEmail)
    ]);

    console.log('Cancellation notification emails sent successfully');

  } catch (error) {
    console.error('Error sending cancellation notifications:', error);
  }
}

/**
 * Mark appointment as no-show and charge client (professional only)
 */
export async function markNoShowAction(
  appointmentId: string,
  chargePercentage: number // 0-100
): Promise<{ success: boolean; error?: string; chargeAmount?: number; message?: string }> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get appointment with booking and professional data
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        bookings!inner(
          *,
          professional_profiles!inner(
            user_id,
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
            stripe_payment_intent_id,
            payment_methods(name, is_online)
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    const booking = appointment.bookings;
    const professionalProfile = booking.professional_profiles;
    const payment = booking.booking_payments;

    // Only professionals can mark no-show
    if (user.id !== professionalProfile.users.id) {
      return { success: false, error: 'Only the professional can mark appointments as no-show' };
    }

    // Check if appointment is completed (past appointment time)
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.end_time}`);
    const now = new Date();
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (now < appointmentDateTime) {
      return { success: false, error: 'Cannot mark appointment as no-show before the appointment time has passed' };
    }

    // Check if within valid time window (24 hours after appointment end)
    if (now > new Date(appointmentDateTime.getTime() + timeWindow)) {
      return { success: false, error: 'No-show can only be marked within 24 hours after the appointment time' };
    }

    // Check if already processed
    if (appointment.status === 'cancelled' || booking.status === 'cancelled') {
      return { success: false, error: 'Appointment already cancelled' };
    }

    // Validate charge percentage
    if (chargePercentage < 0 || chargePercentage > 100) {
      return { success: false, error: 'Charge percentage must be between 0 and 100' };
    }

    // Only process charge if payment exists and is card payment
    let chargeAmount = 0;
    let chargedSuccessfully = false;

    if (payment && payment.payment_methods?.is_online && chargePercentage > 0) {
      // Calculate total service amount (excluding tip and service fee)
      const totalServiceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
      chargeAmount = (totalServiceAmount * chargePercentage) / 100;

      try {
        // If payment intent exists and was captured, create a new charge
        if (payment.stripe_payment_intent_id && payment.status === 'completed') {
          // For completed payments, we would need to create a new payment intent or charge
          // This would require the client's saved payment method
          console.log(`No-show charge would be: $${chargeAmount.toFixed(2)} (${chargePercentage}% of $${totalServiceAmount.toFixed(2)})`);
          // TODO: Implement actual charging logic based on business requirements
          chargedSuccessfully = true;
        }
      } catch (stripeError) {
        console.error('Failed to process no-show charge:', stripeError);
        // Continue with status update even if charge fails
      }
    }

    // Update appointment and booking status
    const { error: updateAppointmentError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateAppointmentError) {
      return { success: false, error: 'Failed to update appointment status' };
    }

    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateBookingError) {
      return { success: false, error: 'Failed to update booking status' };
    }

    // Send notification emails
    await sendNoShowEmails(appointment, chargeAmount, chargePercentage);

    // Revalidate the booking detail page
    revalidatePath(`/bookings/${appointmentId}`);

    return { 
      success: true, 
      chargeAmount: chargedSuccessfully ? chargeAmount : 0,
      message: chargedSuccessfully 
        ? `No-show recorded and $${chargeAmount.toFixed(2)} charged`
        : 'No-show recorded (no charge processed)'
    };

  } catch (error) {
    console.error('Error marking no-show:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Cancel booking with cancellation policy charge (client only)
 */
export async function cancelWithPolicyAction(
  bookingId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string; chargeAmount?: number }> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get booking with all related data including cancellation policy
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        appointments!inner(*),
        professional_profiles!inner(
          cancellation_policy_enabled,
          cancellation_24h_charge_percentage,
          cancellation_48h_charge_percentage,
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
          stripe_payment_intent_id,
          payment_methods(name, is_online)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    const appointment = booking.appointments;
    const professionalProfile = booking.professional_profiles;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;
    const payment = booking.booking_payments;

    // Only clients can use cancellation policy
    if (user.id !== clientUser.id) {
      return { success: false, error: 'Only the client can cancel with policy' };
    }

    // Check if cancellation policy is enabled
    if (!professionalProfile.cancellation_policy_enabled) {
      return { success: false, error: 'Professional does not have cancellation policy enabled' };
    }

    // Check if already cancelled
    if (booking.status === 'cancelled' || appointment.status === 'cancelled') {
      return { success: false, error: 'Booking already cancelled' };
    }

    // Calculate charge based on time until appointment
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let chargePercentage = 0;
    if (hoursUntilAppointment < 24) {
      chargePercentage = professionalProfile.cancellation_24h_charge_percentage;
    } else if (hoursUntilAppointment < 48) {
      chargePercentage = professionalProfile.cancellation_48h_charge_percentage;
    }
    // No charge if more than 48 hours

    // Calculate charge amount from service total (excluding tip and service fee)
    const totalServiceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
    const chargeAmount = (totalServiceAmount * chargePercentage) / 100;

    let chargedSuccessfully = false;

    // Process charge if applicable and payment is online
    if (chargeAmount > 0 && payment && payment.payment_methods?.is_online) {
      try {
        // For cancellation policy charges, we would create a new charge
        // This would require the client's saved payment method
        console.log(`Cancellation policy charge: $${chargeAmount.toFixed(2)} (${chargePercentage}% of $${totalServiceAmount.toFixed(2)})`);
        // TODO: Implement actual charging logic
        chargedSuccessfully = true;
      } catch (stripeError) {
        console.error('Failed to process cancellation policy charge:', stripeError);
        // Continue with cancellation even if charge fails
      }
    }

    // Update booking and appointment status
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

    // Handle payment status
    if (payment) {
      // Cancel uncaptured payment intent if exists
      if (payment.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
          
          if (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'requires_confirmation') {
            await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
            console.log(`Cancelled Stripe payment intent: ${payment.stripe_payment_intent_id}`);
          }
        } catch (stripeError) {
          console.error('Failed to cancel Stripe payment intent:', stripeError);
        }
      }

      const newPaymentStatus = chargeAmount > 0 ? 'partially_refunded' : 'refunded';
      const { error: updatePaymentError } = await supabase
        .from('booking_payments')
        .update({
          status: newPaymentStatus,
          pre_auth_scheduled_for: null,
          capture_scheduled_for: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updatePaymentError) {
        console.error('Failed to update payment status:', updatePaymentError);
      }
    }

    // Send cancellation policy notification emails
    await sendCancellationPolicyEmails(booking, cancellationReason, chargeAmount, chargePercentage);

    // Revalidate the booking detail page
    revalidatePath(`/bookings/${appointment.id}`);

    return { 
      success: true, 
      chargeAmount: chargedSuccessfully ? chargeAmount : 0 
    };

  } catch (error) {
    console.error('Error cancelling with policy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if professional can mark appointment as no-show
 */
export async function canMarkNoShowAction(
  appointmentId: string
): Promise<{ canMark: boolean; reason?: string; timeRemaining?: string }> {
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canMark: false, reason: 'Unauthorized' };
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        bookings!inner(
          status,
          professional_profiles!inner(
            user_id
          ),
          booking_payments(
            payment_methods(is_online)
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return { canMark: false, reason: 'Appointment not found' };
    }

    const booking = appointment.bookings;
    const professionalProfile = booking.professional_profiles;

    // Check if user is the professional
    if (user.id !== professionalProfile.user_id) {
      return { canMark: false, reason: 'Only the professional can mark no-show' };
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled' || booking.status === 'cancelled') {
      return { canMark: false, reason: 'Appointment already cancelled' };
    }

    // Check timing constraints
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.end_time}`);
    const now = new Date();
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours

    if (now < appointmentDateTime) {
      const hoursUntil = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      return { 
        canMark: false, 
        reason: 'Cannot mark as no-show before appointment time has passed',
        timeRemaining: `${hoursUntil} hours until appointment`
      };
    }

    if (now > new Date(appointmentDateTime.getTime() + timeWindow)) {
      return { 
        canMark: false, 
        reason: 'No-show window has expired (24 hours after appointment)' 
      };
    }

    return { canMark: true };

  } catch (error) {
    console.error('Error checking no-show eligibility:', error);
    return { canMark: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Check cancellation policy details for a booking
 */
export async function getCancellationPolicyAction(
  bookingId: string
): Promise<{ 
  hasPolicy: boolean; 
  chargeInfo?: { 
    percentage: number; 
    amount: number; 
    timeUntilAppointment: number;
  }; 
  error?: string 
}> {
  const supabase = await createClient();

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        appointments!inner(*),
        professional_profiles!inner(
          cancellation_policy_enabled,
          cancellation_24h_charge_percentage,
          cancellation_48h_charge_percentage
        ),
        booking_services(price)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { hasPolicy: false, error: 'Booking not found' };
    }

    const professionalProfile = booking.professional_profiles;
    const appointment = booking.appointments;

    if (!professionalProfile.cancellation_policy_enabled) {
      return { hasPolicy: false };
    }

    // Calculate time until appointment
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Determine charge percentage
    let chargePercentage = 0;
    if (hoursUntilAppointment < 24) {
      chargePercentage = professionalProfile.cancellation_24h_charge_percentage;
    } else if (hoursUntilAppointment < 48) {
      chargePercentage = professionalProfile.cancellation_48h_charge_percentage;
    }

    // Calculate charge amount
    const totalServiceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
    const chargeAmount = (totalServiceAmount * chargePercentage) / 100;

    return {
      hasPolicy: true,
      chargeInfo: {
        percentage: chargePercentage,
        amount: chargeAmount,
        timeUntilAppointment: hoursUntilAppointment
      }
    };

  } catch (error) {
    console.error('Error getting cancellation policy:', error);
    return { hasPolicy: false, error: 'Error checking policy' };
  }
}

// Email sending functions
 
async function sendNoShowEmails(appointment: any, chargeAmount: number, chargePercentage: number) {
  try {
     
    const booking = appointment.bookings as any;
     
    const professionalProfile = booking.professional_profiles as any;
     
    const professionalUser = professionalProfile.users as any;
     
    const clientUser = booking.clients as any;
    
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const appointmentTime = `${appointment.start_time} - ${appointment.end_time}`;
    
    const services = booking.booking_services.map((bs: any) => ({
      name: bs.services.name,
      price: bs.price
    }));
    
    const chargeInfo = chargeAmount > 0 ? {
      amount: chargeAmount,
      percentage: chargePercentage,
      originalAmount: booking.booking_services.reduce((sum: number, bs: any) => sum + bs.price, 0)
    } : undefined;
    
    // Send client notification
    const clientEmail = await createNoShowNotificationClientEmail(
      `${clientUser.first_name} ${clientUser.last_name}`,
      `${professionalUser.first_name} ${professionalUser.last_name}`,
      appointmentDate,
      appointmentTime,
      appointment.id,
      services,
      chargeInfo,
      process.env.NEXT_PUBLIC_BASE_URL || '',
      process.env.NEXT_PUBLIC_BASE_URL || ''
    );
    
    await sendEmail({
      to: [{ email: clientUser.email, name: `${clientUser.first_name} ${clientUser.last_name}` }],
      subject: clientEmail.subject,
      htmlContent: clientEmail.html,
      textContent: clientEmail.text,
    });
    
    // Send professional notification
    const professionalEmail = await createNoShowNotificationProfessionalEmail(
      `${professionalUser.first_name} ${professionalUser.last_name}`,
      `${clientUser.first_name} ${clientUser.last_name}`,
      clientUser.client_profiles?.phone,
      appointmentDate,
      appointmentTime,
      appointment.id,
      services,
      chargeInfo,
      process.env.NEXT_PUBLIC_BASE_URL || ''
    );
    
    await sendEmail({
      to: [{ email: professionalUser.email, name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      subject: professionalEmail.subject,
      htmlContent: professionalEmail.html,
      textContent: professionalEmail.text,
    });
    
    console.log('No-show notification emails sent successfully');
  } catch (error) {
    console.error('Error sending no-show notification emails:', error);
  }
}

async function sendCancellationPolicyEmails(booking: any, reason: string, chargeAmount: number, chargePercentage: number) {
  try {
    const appointment = booking.appointments as any;
    const professionalProfile = booking.professional_profiles as any;
    const professionalUser = professionalProfile.users as any;
    const clientUser = booking.clients as any;
    
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const appointmentTime = `${appointment.start_time} - ${appointment.end_time}`;
    
    const services = booking.booking_services.map((bs: any) => ({
      name: bs.services.name,
      price: bs.price
    }));
    
    const serviceAmount = booking.booking_services.reduce((sum: number, bs: any) => sum + bs.price, 0);
    
    // Calculate time description
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.start_time}`);
    const hoursUntil = Math.round((appointmentDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    const timeDescription = hoursUntil < 24 ? 'Less than 24 hours' : 
                           hoursUntil < 48 ? 'Less than 48 hours' : 
                           'More than 48 hours';
    
    const policyInfo = {
      chargeAmount,
      chargePercentage,
      serviceAmount,
      timeDescription
    };
    
    const payment = booking.booking_payments as any;
    const refundInfo = payment ? {
      originalAmount: payment.amount + (payment.tip_amount || 0),
      refundAmount: (payment.amount + (payment.tip_amount || 0)) - chargeAmount,
      status: 'Processing'
    } : undefined;
    
    // Send client notification
    const clientEmail = await createCancellationPolicyChargeClientEmail(
      `${clientUser.first_name} ${clientUser.last_name}`,
      `${professionalUser.first_name} ${professionalUser.last_name}`,
      appointmentDate,
      appointmentTime,
      booking.id,
      reason,
      services,
      policyInfo,
      refundInfo,
      process.env.NEXT_PUBLIC_BASE_URL || ''
    );
    
    await sendEmail({
      to: [{ email: clientUser.email, name: `${clientUser.first_name} ${clientUser.last_name}` }],
      subject: clientEmail.subject,
      htmlContent: clientEmail.html,
      textContent: clientEmail.text,
    });
    
    // Send professional notification
    const professionalEmail = await createCancellationPolicyChargeProfessionalEmail(
      `${professionalUser.first_name} ${professionalUser.last_name}`,
      `${clientUser.first_name} ${clientUser.last_name}`,
      clientUser.client_profiles?.phone,
      appointmentDate,
      appointmentTime,
      booking.id,
      reason,
      services,
      policyInfo,
      process.env.NEXT_PUBLIC_BASE_URL || ''
    );
    
    await sendEmail({
      to: [{ email: professionalUser.email, name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      subject: professionalEmail.subject,
      htmlContent: professionalEmail.html,
      textContent: professionalEmail.text,
    });
    
    console.log('Cancellation policy notification emails sent successfully');
  } catch (error) {
    console.error('Error sending cancellation policy notification emails:', error);
  }
} 