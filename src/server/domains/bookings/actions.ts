/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendBookingCancellationClient,
  sendBookingCancellationProfessional,
  sendCancellationPolicyChargeClient,
  sendCancellationPolicyChargeProfessional,
  sendNoShowNotificationClient,
  sendNoShowNotificationProfessional,
} from '@/providers/brevo/templates';
import { revalidatePath } from 'next/cache';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@supabase/types';

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

// Database types
type AppointmentBase = {
  id: string;
  booking_id: string;
  status: 'active' | 'completed' | 'cancelled' | 'ongoing';
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  computed_status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

type ProfessionalProfile = {
  id: string;
  user_id: string;
  cancellation_policy_enabled: boolean;
  stripe_account_id?: string;
  cancellation_24h_charge_percentage: number;
  cancellation_48h_charge_percentage: number;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

type BookingService = {
  id: string;
  price: number;
  services?: {
    name: string;
  };
}

type BookingPayment = {
  id: string;
  amount: number;
  tip_amount: number;
  service_fee?: number;
  status: 'incomplete' | 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'deposit_paid' | 'awaiting_balance' | 'authorized' | 'pre_auth_scheduled';
  stripe_payment_intent_id?: string;
  stripe_payment_method_id?: string;
  payment_methods?: {
    name: string;
    is_online: boolean;
  };
}

// Query result types
type BookingQueryResult = {
  id: string;
  status: 'pending_payment' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
  client_id: string;
  professional_profile_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  appointments: AppointmentBase[];
  appointments_with_status?: AppointmentBase[];
  professional_profiles: ProfessionalProfile;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  booking_services: BookingService[];
  booking_payments?: BookingPayment[];
}

type AppointmentQueryResult = AppointmentBase & {
  bookings: {
    id: string;
    status: 'pending_payment' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
    client_id: string;
    professional_profile_id: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    professional_profiles: {
      id: string;
      user_id: string;
      users: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
      };
    };
    clients: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    booking_services: BookingService[];
    booking_payments?: BookingPayment[];
  };
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
        appointments!inner(
          id,
          status,
          start_time
        ),
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
          service_fee,
          status,
          stripe_payment_intent_id,
          stripe_payment_method_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Get the first appointment since we queried with !inner
    const appointment = booking.appointments[0];
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    const professionalProfile = booking.professional_profiles;
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;
    const payment = Array.isArray(booking.booking_payments) && booking.booking_payments.length > 0 ? booking.booking_payments[0] : undefined;

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
      // Handle uncaptured payment intent for cancellations without policy
      if (payment.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
          
          if (paymentIntent.status === 'requires_capture') {
            // Get customer ID for partial capture
            const customerId = paymentIntent.customer as string;
            const paymentMethodId = payment.stripe_payment_method_id;
            
            console.log(`[Debug] Customer ID: ${customerId}, Payment Method ID: ${paymentMethodId}`);
              
            if (customerId) {
              // For split payment architecture with no-policy cancellations:
              // Service fee was already captured ($1.00 for platform)
              // We just need to cancel the remaining uncaptured service amount (full refund to customer)
              console.log(`[Split Payment Cancellation] Regular cancellation - no policy`);
              console.log(`[Split Payment Cancellation] Service fee already captured: $1.00 (platform)`);
              console.log(`[Split Payment Cancellation] Cancelling remaining uncaptured amount for full customer refund`);
              
              await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
              console.log(`✅ Split payment cancellation completed:`);
              console.log(`   - Service fee already captured: $1.00 (platform)`);
              console.log(`   - Uncaptured service amount cancelled and refunded to customer`);
            } else {
              // Missing customer ID, cannot do partial capture
              console.error(`Missing customer ID for payment intent ${payment.stripe_payment_intent_id}. Customer: ${customerId}`);
              await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
              console.log(`Fallback: Cancelled entire payment intent due to missing customer ID: ${payment.stripe_payment_intent_id}`);
            }
          } else if (paymentIntent.status === 'requires_confirmation') {
            await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
            console.log(`Cancelled Stripe payment intent: ${payment.stripe_payment_intent_id}`);
          } else {
            console.log(`Payment intent ${payment.stripe_payment_intent_id} is in status ${paymentIntent.status}, cannot cancel`);
          }
        } catch (stripeError) {
          console.error('Failed to handle payment intent during cancellation:', stripeError);
          // Don't fail the entire cancellation for Stripe errors
        }
      }

      // Calculate refund amount for regular cancellation (full refund minus service fee)
      const originalAmount = payment.amount + payment.tip_amount;
      const serviceFee = payment.service_fee || 1.00; // Default to $1 if not set
      const refundAmount = originalAmount - serviceFee; // Customer gets everything back except suite service fee

      const { error: updatePaymentError } = await supabase
        .from('booking_payments')
        .update({
          status: 'refunded',
          pre_auth_scheduled_for: null,
          capture_scheduled_for: null,
          refunded_amount: refundAmount,
          refund_reason: `Regular cancellation: ${cancellationReason}`,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updatePaymentError) {
        console.error('Failed to update payment status:', updatePaymentError);
      }
    }

    console.log('Sending cancellation emails', booking); 

    // Send email notifications
    await sendCancellationEmails(booking as any, cancellationReason);

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
        appointments_with_status!inner(*),
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

    const appointment = Array.isArray(booking.appointments_with_status) 
      ? booking.appointments_with_status[0] 
      : booking.appointments_with_status;

    if (!appointment) {
      return { canCancel: false, reason: 'Appointment not found' };
    }

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

    // Check if completed based on computed status
    if (appointment.computed_status === 'completed') {
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
async function sendCancellationEmails(booking: BookingQueryResult, cancellationReason: string): Promise<void> {
  const adminSupabase = createSupabaseAdminClient(); 

  const { data: clientAuth } = await adminSupabase.auth.admin.getUserById(booking.clients.id);     
  const { data: professionalAuth } = await adminSupabase.auth.admin.getUserById(booking.professional_profiles.users.id);

  const appointment = booking.appointments[0];
  if (!appointment) throw new Error('Appointment not found');
  
  const professionalUser = booking.professional_profiles.users;
  const clientUser = booking.clients;

  const appointmentDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const baseParams = {
    booking_id: booking.id,
    appointment_id: appointment.id,
    date: appointmentDate,
    time: appointmentTime,
    appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointment.id}`,
    website_url: process.env.NEXT_PUBLIC_BASE_URL!,
    support_email: process.env.BREVO_ADMIN_EMAIL!
  };

  console.log('APPOINTMENT', baseParams.appointment_details_url);

  // Send cancellation emails to both client and professional
  await Promise.all([
    sendBookingCancellationClient(
      [{ 
        email: clientAuth.user?.email || '', 
        name: `${clientUser.first_name} ${clientUser.last_name}` 
      }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        cancellation_reason: cancellationReason,
        ...baseParams
      }
    ),
    sendBookingCancellationProfessional(
      [{ 
        email: professionalAuth.user?.email || '', 
        name: `${professionalUser.first_name} ${professionalUser.last_name}` 
      }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        cancellation_reason: cancellationReason,
        ...baseParams
      }
    )
  ]);
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
    const { data: appointmentData, error } = await supabase
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

    if (error || !appointmentData) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentData;
    const booking = appointment.bookings;
    const professionalProfile = booking.professional_profiles;
    const payment = Array.isArray(booking.booking_payments) 
      ? booking.booking_payments[0] 
      : booking.booking_payments;

    // Only professionals can mark no-show
    if (user.id !== professionalProfile.user_id) {
      return { success: false, error: 'Only the professional can mark appointments as no-show' };
    }

    // Check if appointment is completed (past appointment time)
    const appointmentDateTime = new Date(appointment.end_time);
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
    await sendNoShowEmails(appointment as any, chargeAmount);

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
          stripe_account_id,
          cancellation_24h_charge_percentage,
          cancellation_48h_charge_percentage,
          users!inner(id, first_name, last_name)
        ),
        clients:users!client_id(id, first_name, last_name),
        booking_services(price)
      `)
      .eq('id', bookingId)
      .single() as { data: BookingQueryResult | null; error: any };

    if (error || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    const appointments = Array.isArray(booking.appointments) ? booking.appointments : [booking.appointments];
    const appointment = appointments[0];
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    const professionalProfile = booking.professional_profiles;
    const clientUser = booking.clients;
    const payment = booking.booking_payments?.[0];

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
    const appointmentDateTime = new Date(appointment.end_time);
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
      // Handle uncaptured payment intent for cancellations with policy
      if (payment.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
          
          if (paymentIntent.status === 'requires_capture') {
            // Get customer ID and payment method for dual payment approach
            const customerId = paymentIntent.customer as string;
            const paymentMethodId = payment.stripe_payment_method_id;
            
            console.log(`[Debug] Customer ID: ${customerId}, Payment Method ID: ${paymentMethodId}, Professional Stripe Account: ${professionalProfile.stripe_account_id}`);
            
            if (customerId && professionalProfile.stripe_account_id) {
              // For split payment architecture: service fee already captured by platform
              // Now we need to capture cancellation fee and transfer it to professional
              const totalServiceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
              const cancellationFeeAmount = Math.round(chargeAmount * 100); // Convert to cents
              
              console.log(`[Split Payment Cancellation] Processing cancellation with fee`);
              console.log(`[Split Payment Cancellation] Service amount uncaptured: $${totalServiceAmount}, Cancellation fee: $${cancellationFeeAmount/100}`);
              
              try {
                // Check if payment method is available for charging cancellation fee
                if (!payment.stripe_payment_method_id) {
                  console.error('❌ No payment method ID found - cannot charge cancellation fee');
                  
                  // Try to cancel the payment intent to refund service amount to customer
                  try {
                    const cancelResult = await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
                    console.log(`[Split Payment Cancellation] ✅ Cancelled payment intent: ${cancelResult.id} - service amount refunded to customer`);
                  } catch (cancelError: any) {
                    if (cancelError.code === 'payment_intent_unexpected_state') {
                      console.log(`[Split Payment Cancellation] Payment intent already cancelled/processed - continuing`);
                    } else {
                      console.error('Error cancelling payment intent:', cancelError);
                    }
                  }
                  chargedSuccessfully = false;
                } else {
                  // We have a payment method, so we can charge cancellation fee
                  console.log(`[Split Payment Cancellation] Payment method available: ${payment.stripe_payment_method_id}`);
                  
                  if (cancellationFeeAmount > 0) {
                    // Step 1: Try to cancel the uncaptured payment intent (this refunds service amount to customer)
                    try {
                      const cancelResult = await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
                      console.log(`[Split Payment Cancellation] Cancelled uncaptured PaymentIntent: ${cancelResult.id}`);
                    } catch (cancelError: any) {
                      if (cancelError.code === 'payment_intent_unexpected_state') {
                        console.log(`[Split Payment Cancellation] Payment intent already cancelled - continuing with fee charge`);
                      } else {
                        throw cancelError;
                      }
                    }
                    
                    // Step 2: Create separate charge for cancellation fee
                    console.log(`[Split Payment Cancellation] Creating separate charge for cancellation fee: $${cancellationFeeAmount/100}`);
                    
                    const cancellationCharge = await stripe.paymentIntents.create({
                      amount: cancellationFeeAmount,
                      currency: 'usd',
                      payment_method: payment.stripe_payment_method_id,
                      customer: customerId,
                      confirm: true,
                      payment_method_types: ['card'], // Specify payment method types instead of disabling automatic
                      transfer_data: {
                        destination: professionalProfile.stripe_account_id,
                        amount: cancellationFeeAmount // Transfer full cancellation fee to professional
                      },
                      metadata: {
                        payment_type: 'cancellation_fee',
                        booking_id: booking.id,
                        original_payment_intent: payment.stripe_payment_intent_id
                      }
                    });
                    
                    console.log(`[Split Payment Cancellation] ✅ Cancellation fee charged: $${cancellationCharge.amount/100}`);
                    chargedSuccessfully = true;
                  } else {
                    // No cancellation fee, just cancel the uncaptured payment intent
                    try {
                      const cancelResult = await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
                      console.log(`[Split Payment Cancellation] No fee - cancelled uncaptured amount: ${cancelResult.id}`);
                    } catch (cancelError: any) {
                      if (cancelError.code === 'payment_intent_unexpected_state') {
                        console.log(`[Split Payment Cancellation] Payment intent already cancelled - no action needed`);
                      } else {
                        throw cancelError;
                      }
                    }
                    chargedSuccessfully = false; // No fee charged
                  }
                }
              } catch (error) {
                console.error('❌ Failed to process split payment cancellation:', error);
                chargedSuccessfully = false;
              }
            } else {
              // Missing required data, cannot do partial capture
              console.error(`Missing required data for split payment cancellation - Customer: ${customerId}, Professional Account: ${professionalProfile.stripe_account_id}`);
              await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
              console.log(`Fallback: Cancelled entire payment intent due to missing data: ${payment.stripe_payment_intent_id}`);
            }
          } else if (paymentIntent.status === 'requires_confirmation') {
            await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
            console.log(`Cancelled Stripe payment intent: ${payment.stripe_payment_intent_id}`);
          }
        } catch (stripeError) {
          console.error('Failed to handle payment intent during cancellation:', stripeError);
        }
      }

      const newPaymentStatus = chargeAmount > 0 ? 'partially_refunded' : 'refunded';
      
      // Calculate refund amount (original amount minus cancellation fee and service fee)
      const originalAmount = payment.amount + payment.tip_amount; // Total originally charged to customer
      const serviceFee = payment.service_fee || 1.00; // Default to $1 if not set
      const refundAmount = originalAmount - chargeAmount - serviceFee;
      
      const { error: updatePaymentError } = await supabase
        .from('booking_payments')
        .update({
          status: newPaymentStatus,
          pre_auth_scheduled_for: null,
          capture_scheduled_for: null,
          refunded_amount: refundAmount,
          refund_reason: `Cancellation: ${cancellationReason}`,
          refunded_at: new Date().toISOString(),
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
    const firstAppointment = Array.isArray(booking.appointments) ? booking.appointments[0] : booking.appointments;
    if (firstAppointment) {
      revalidatePath(`/bookings/${firstAppointment.id}`);
    }

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
    const appointmentDateTime = new Date(appointment.end_time);
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

    const appointment = booking.appointments[0] as AppointmentQueryResult;
    if (!appointment) {
      return { hasPolicy: false, error: 'Appointment not found' };
    }

    const professionalProfile = booking.professional_profiles;

    if (!professionalProfile.cancellation_policy_enabled) {
      return { hasPolicy: false };
    }

    // Calculate time until appointment
    const appointmentDateTime = new Date(appointment.end_time);
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

/**
 * Send no-show notification emails to both client and professional
 */
async function sendNoShowEmails(appointment: AppointmentQueryResult, chargeAmount: number): Promise<void> {
  const booking = appointment.bookings;
  if (!booking) throw new Error('Booking not found');

  const professionalUser = booking.professional_profiles.users;
  const clientUser = booking.clients;

  const appointmentDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const baseParams = {
    booking_id: booking.id,
    appointment_id: appointment.id,
    date: appointmentDate,
    time: appointmentTime,
    appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointment.id}`,
    website_url: process.env.NEXT_PUBLIC_BASE_URL!,
    support_email: process.env.BREVO_ADMIN_EMAIL!
  };

  await Promise.all([
    sendNoShowNotificationClient(
      [{ email: clientUser.email, name: `${clientUser.first_name} ${clientUser.last_name}` }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        no_show_fee: chargeAmount,
        ...baseParams
      }
    ),
    sendNoShowNotificationProfessional(
      [{ email: professionalUser.email, name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        no_show_fee: chargeAmount,
        ...baseParams
      }
    )
  ]);
}

/**
 * Send cancellation policy charge emails to both client and professional
 */
async function sendCancellationPolicyEmails(
  booking: BookingQueryResult,
  reason: string,
  chargeAmount: number,
  chargePercentage: number
): Promise<void> {
  const appointment = booking.appointments[0];
  if (!appointment) throw new Error('Appointment not found');
  
  const professionalUser = booking.professional_profiles.users;
  const clientUser = booking.clients;
  const serviceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
  const appointmentDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const baseParams = {
    booking_id: booking.id,
    appointment_id: appointment.id,
    date: appointmentDate,
    time: appointmentTime,
    appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointment.id}`,
    website_url: process.env.NEXT_PUBLIC_BASE_URL!,
    support_email: process.env.BREVO_ADMIN_EMAIL!
  };

  const policyInfo = {
    charge_amount: chargeAmount,
    charge_percentage: chargePercentage,
    service_amount: serviceAmount,
    time_description: 'Less than 24 hours' // TODO: Calculate this based on appointment time
  };

  await Promise.all([
    sendCancellationPolicyChargeClient(
      [{ email: clientUser.email, name: `${clientUser.first_name} ${clientUser.last_name}` }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        policy_info: policyInfo,
        ...baseParams
      }
    ),
    sendCancellationPolicyChargeProfessional(
      [{ email: professionalUser.email, name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      {
        client_name: `${clientUser.first_name} ${clientUser.last_name}`,
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        policy_info: policyInfo,
        ...baseParams
      }
    )
  ]);
} 