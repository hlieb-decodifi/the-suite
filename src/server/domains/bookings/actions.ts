/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/lib/stripe/server';
import {
  sendBookingCancellationNoShowClient,
  sendBookingCancellationNoShowProfessional,
  sendBookingCancellationLessthan24h48hclient,
  sendBookingCancellationLessthan24h48hprofessional,
  sendBookingCancellationWithinAcceptedTimePeriodClient,
  sendBookingCancellationWithinAcceptedTimePeriodProfessional,
  sendAppointmentCompletion2hafterClient,
  sendAppointmentCompletion2hafterProfessional
} from '@/providers/brevo/templates';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@supabase/types';
import {
  AppointmentCompletion2hafterClientParams,
  AppointmentCompletion2hafterProfessionalParams
} from '@/providers/brevo/types';


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
  address_id?: string;
  address?: {
    street_address: string;
    apartment?: string;
    city: string;
    state: string;
    country: string;
  };
  timezone?: string;
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
  duration: number;
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
    client_profiles?: Array<{ timezone?: string }>;
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
  // Use admin client only for booking data fetch
  const adminSupabase = createSupabaseAdminClient();
  const supabase = await createClient();

  console.log('[Cancellation] Starting cancellation process for booking:', bookingId);

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Cancellation] ❌ Unauthorized - no user found');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[Cancellation] 👤 User authenticated:', user.id);

  // Get booking with all related data using admin client
  const { data: booking, error } = await adminSupabase
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
          cancellation_24h_charge_percentage,
          cancellation_48h_charge_percentage,
          stripe_account_id,
          address_id,
          address:address_id(
            street_address,
            apartment,
            city,
            state,
            country
          ),
          timezone,
          users!inner(id, first_name, last_name)
        ),
        clients:users!client_id(id, first_name, last_name, client_profiles(*)),
        booking_services(
          id,
          price,
          services(name)
        ),
        booking_payments!inner(
          id,
          amount,
          tip_amount,
          service_fee,
          deposit_amount,
          status,
          stripe_payment_intent_id,
          stripe_payment_method_id,
          payment_methods!inner(is_online)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.log('[Cancellation] ❌ Booking not found:', { error });
      return { success: false, error: 'Booking not found' };
    }

    console.log('[Cancellation] 📋 Booking details:', {
      bookingId: booking.id,
      status: booking.status,
      appointmentCount: booking.appointments.length,
      hasPayment: !!booking.booking_payments
    });

    // Get the first appointment since we queried with !inner
    const appointment = booking.appointments[0];
    if (!appointment) {
      console.log('[Cancellation] ❌ No appointment found for booking');
      return { success: false, error: 'Appointment not found' };
    }

    const professionalProfile = booking.professional_profiles;
    const professionalUser = professionalProfile.users;
    const clientUser = booking.clients;
    const payment = booking.booking_payments;

    console.log('[Cancellation] 💳 Payment details:', {
      paymentId: payment?.id,
      paymentStatus: payment?.status,
      paymentAmount: payment?.amount,
      depositAmount: payment?.deposit_amount,
      serviceFee: payment?.service_fee,
      paymentIntentId: payment?.stripe_payment_intent_id,
      isOnlinePayment: payment?.payment_methods?.is_online
    });

    // Check authorization
    const isProfessional = user.id === professionalUser.id;
    const isClient = user.id === clientUser.id;

    if (!isProfessional && !isClient) {
      console.log('[Cancellation] ❌ Unauthorized - user is neither professional nor client');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[Cancellation] 🔐 Authorization:', {
      userId: user.id,
      isProfessional,
      isClient,
      professionalId: professionalUser.id,
      clientId: clientUser.id
    });

    // Check if already cancelled
    if (booking.status === 'cancelled' || appointment.status === 'cancelled') {
      console.log('[Cancellation] ❌ Booking already cancelled');
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
      console.log('[Cancellation] ❌ Failed to update booking status:', updateBookingError);
      return { success: false, error: 'Failed to update booking status' };
    }

    console.log('[Cancellation] ✅ Updated booking status to cancelled');

    const { error: updateAppointmentError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (updateAppointmentError) {
      console.log('[Cancellation] ❌ Failed to update appointment status:', updateAppointmentError);
      return { success: false, error: 'Failed to update appointment status' };
    }

    console.log('[Cancellation] ✅ Updated appointment status to cancelled');

    // Handle payment and refund if there's a payment record
    if (payment && payment.stripe_payment_intent_id) {

      try {
        console.log(`[Payment Intent] 🔍 Retrieving payment intent ${payment.stripe_payment_intent_id}`);
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        console.log(`[Payment Intent] Status: ${paymentIntent.status}`, {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          captureMethod: paymentIntent.capture_method,
          paymentStatus: paymentIntent.status
        });

        // Handle different payment intent statuses
        if (paymentIntent.status === 'requires_capture') {
          console.log(`[Payment Intent] 💰 Payment requires capture`);
          const customerId = paymentIntent.customer as string;
          console.log(`[Payment Intent] Customer ID: ${customerId}`);
          
          if (customerId && professionalProfile.stripe_account_id) {
            console.log(`[Payment Intent] Professional stripe account: ${professionalProfile.stripe_account_id}`);
            // Different refund logic based on who is cancelling
            if (isProfessional) {
              // Professional cancelling: Full refund including deposit, professional pays fees
              const refundAmount = payment.amount + (payment.deposit_amount || 0);
              console.log(`[Professional Cancel] 💸 Refunding full amount:`, {
                baseAmount: payment.amount,
                depositAmount: payment.deposit_amount,
                totalRefund: refundAmount
              });

              const refund = await stripe.refunds.create({
                payment_intent: payment.stripe_payment_intent_id,
                amount: refundAmount,
                metadata: {
                  reason: 'Professional cancelled - full refund including deposit'
                }
              });

              console.log(`[Professional Cancel] ✅ Full refund processed:`, {
                refundId: refund.id,
                refundStatus: refund.status,
                refundAmount: refund.amount
              });
            } else {
              // Client cancelling: Check cancellation policy
              if (!professionalProfile.cancellation_policy_enabled) {
                console.log(`[Client Cancel] No cancellation policy - processing refund`);
                console.log(`[Client Cancel] Payment details:`, {
                  amount: payment.amount,
                  depositAmount: payment.deposit_amount,
                  serviceFee: payment.service_fee,
                  paymentIntentId: payment.stripe_payment_intent_id,
                  paymentStatus: payment.status
                });

                // No policy - full refund including deposit, minus service fee
                const refundAmount = payment.amount + (payment.deposit_amount || 0) - (payment.service_fee || 0);
                console.log(`[Client Cancel] 💰 Refund calculation:`, {
                  paymentAmount: payment.amount,
                  depositAmount: payment.deposit_amount || 0,
                  serviceFee: payment.service_fee || 0,
                  totalRefund: refundAmount
                });

                try {
                  const refund = await stripe.refunds.create({
                    payment_intent: payment.stripe_payment_intent_id,
                    amount: refundAmount,
                    metadata: {
                      reason: 'Client cancelled - no cancellation policy, full refund minus service fee'
                    }
                  });
                  console.log(`[Client Cancel] ✅ Refund created successfully:`, {
                    refundId: refund.id,
                    status: refund.status,
                    amount: refund.amount
                  });
                } catch (refundError) {
                  console.error('[Client Cancel] ❌ Failed to create refund:', refundError);
                  throw refundError;
                }
              } else {
                // Policy exists - handle in cancelWithPolicyAction
                console.log(`[Client Cancel] ⚠️ Cancellation policy enabled - redirecting to policy flow`);
                return { 
                  success: false, 
                  error: 'Please use cancellation policy flow',
                  message: 'This booking requires cancellation through the policy flow.'
                };
              }
            }
          } else {
            // Missing customer ID or professional stripe account, cancel entire payment
            console.log(`[Payment Intent] ⚠️ Missing customer ID or professional stripe account - cancelling entire payment`);
            await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
            console.log(`[Payment Intent] ✅ Payment cancelled`);
          }
        } else if (paymentIntent.status === 'succeeded') {
          console.log(`[Payment Intent] Payment already succeeded - processing refund`);
          // Handle refund for already succeeded payment
          const refundAmount = isProfessional 
            ? payment.amount + (payment.deposit_amount || 0)  // Professional pays fees
            : payment.amount + (payment.deposit_amount || 0) - (payment.service_fee || 0); // Client pays service fee
          
          console.log(`[Payment Intent] 💰 Refund calculation for succeeded payment:`, {
            paymentAmount: payment.amount,
            depositAmount: payment.deposit_amount || 0,
            serviceFee: payment.service_fee || 0,
            isProfessionalCancelling: isProfessional,
            totalRefund: refundAmount
          });

          try {
            const refund = await stripe.refunds.create({
              payment_intent: payment.stripe_payment_intent_id,
              amount: refundAmount,
              metadata: {
                reason: isProfessional 
                  ? 'Professional cancelled - full refund including deposit'
                  : 'Client cancelled - full refund minus service fee'
              }
            });
            console.log(`[Payment Intent] ✅ Refund processed for succeeded payment:`, {
              refundId: refund.id,
              status: refund.status,
              amount: refund.amount
            });
          } catch (refundError) {
            console.error('[Payment Intent] ❌ Failed to process refund:', refundError);
            throw refundError;
          }
        }

        // Update payment record
        const { error: updatePaymentError } = await supabase
          .from('booking_payments')
          .update({
            status: 'refunded',
            pre_auth_scheduled_for: null,
            capture_scheduled_for: null,
            refunded_amount: isProfessional ? payment.amount + (payment.deposit_amount || 0) : payment.amount + (payment.deposit_amount || 0) - (payment.service_fee || 0),
            refund_reason: `${isProfessional ? 'Professional' : 'Client'} cancellation: ${cancellationReason}`,
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updatePaymentError) {
          console.error('[Payment Record] ❌ Failed to update payment status:', updatePaymentError);
        } else {
          console.log('[Payment Record] ✅ Payment record updated successfully');
        }
      } catch (stripeError) {
        console.error('[Stripe Error] ❌ Failed to handle payment intent during cancellation:', stripeError);
      }
    } else {
      console.log('[Cancellation] ℹ️ No payment record or payment intent to process');
    }

    // Determine cancellation scenario and send appropriate emails
  const appointmentEnd = new Date(appointment.start_time);
    const now = new Date();
    const hoursUntilAppointment = (appointmentEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hasPolicy = professionalProfile.cancellation_policy_enabled;
    let scenario = 'standard';
    let chargeAmount = 0;
    let chargePercentage = 0;

    if (isClient && hasPolicy) {
      if (hoursUntilAppointment < 24) {
        scenario = 'policy_24h';
  chargePercentage = professionalProfile.cancellation_24h_charge_percentage || 0;
      } else if (hoursUntilAppointment < 48) {
        scenario = 'policy_48h';
  chargePercentage = professionalProfile.cancellation_48h_charge_percentage || 0;
      }
      if (chargePercentage > 0) {
        const totalServiceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
        chargeAmount = (totalServiceAmount * chargePercentage) / 100;
      }
    }

    if (scenario === 'standard' || chargePercentage === 0) {
      // Send standard cancellation emails
      console.log('[Cancellation] 📧 Sending standard cancellation emails');
      await sendCancellationEmails(booking as any, cancellationReason);
      console.log('[Cancellation] ✅ Standard cancellation emails sent');
    } else {
      // Send cancellation policy charge emails
      console.log('[Cancellation] 📧 Sending cancellation policy charge emails');
      await sendCancellationPolicyEmails(booking as any, cancellationReason, chargeAmount, chargePercentage);
      console.log('[Cancellation] ✅ Cancellation policy charge emails sent');
    }

    // Revalidate the booking detail page
    revalidatePath(`/bookings/${appointment.id}`);
    console.log('[Cancellation] 🔄 Revalidated booking page');

    return { 
      success: true,
      message: isProfessional 
        ? 'Booking cancelled. Full refund including deposit will be processed.'
        : 'Booking cancelled. Refund will be processed according to cancellation policy.'
    };

  } catch (error) {
    console.error('[Cancellation] ❌ Error cancelling booking:', error);
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

  // Address not needed for these email templates

  const dateTime = `${appointmentDate} ${appointmentTime}`;

  // Helper to convert IANA timezone to abbreviation using Intl.DateTimeFormat
  function ianaToAbbreviation(iana: string | undefined): string {
    if (!iana) return '';
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        timeZoneName: 'short'
      });
      const parts = dtf.formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart?.value || '';
    } catch {
      return '';
    }
  }

  // Get timezones
  const professionalTimezone = (booking.professional_profiles as any)?.timezone;

  // Create services array from booking services
  const services = booking.booking_services.map(bs => ({
    duration: bs.duration,
    name: bs.services?.name || 'Unknown Service',
    price: bs.price
  }));

  const clientParams = {
    booking_id: booking.id,
    cancellation_reason: cancellationReason,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    services_page_url: `${process.env.NEXT_PUBLIC_BASE_URL}/services`,
    timezone: ianaToAbbreviation(professionalTimezone),
    services
  };

  const professionalParams = {
    booking_id: booking.id,
    cancellation_reason: cancellationReason,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    timezone: ianaToAbbreviation(professionalTimezone),
    services
  };

  // Send cancellation emails to both client and professional using new functions
  await Promise.all([
    sendBookingCancellationWithinAcceptedTimePeriodClient(
      [{
        email: clientAuth.user?.email || '',
        name: `${clientUser.first_name} ${clientUser.last_name}`
      }],
      clientParams
    ),
    sendBookingCancellationWithinAcceptedTimePeriodProfessional(
      [{
        email: professionalAuth.user?.email || '',
        name: `${professionalUser.first_name} ${professionalUser.last_name}`
      }],
      professionalParams
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
  // Use admin client for appointment data fetch
  const adminSupabase = createSupabaseAdminClient();
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get appointment with booking and professional data, including address and timezone, using admin client
    const { data: appointmentData, error } = await adminSupabase
      .from('appointments')
      .select(`
        *,
        bookings!inner(
          *,
          professional_profiles!inner(
            user_id,
            address_id,
            address:address_id(
              street_address,
              apartment,
              city,
              state,
              country
            ),
            timezone,
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
  // Use admin client for booking data fetch
  const adminSupabase = createSupabaseAdminClient();
  const supabase = await createClient();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get booking with all related data including address, timezone, and cancellation policy using admin client
    const { data: booking, error } = await adminSupabase
      .from('bookings')
      .select(`
        *,
        appointments!inner(
          id,
          status,
          start_time,
          end_time
        ),
        professional_profiles!inner(
          cancellation_policy_enabled,
          stripe_account_id,
          cancellation_24h_charge_percentage,
          cancellation_48h_charge_percentage,
          address_id,
          address:address_id(
            street_address,
            apartment,
            city,
            state,
            country
          ),
          timezone,
          users!inner(id, first_name, last_name)
        ),
        clients:users!client_id(id, first_name, last_name, client_profiles(*)),
        booking_services(
          id,
          price,
          services(name)
        ),
        booking_payments!inner(
          id,
          amount,
          tip_amount,
          service_fee,
          deposit_amount,
          status,
          stripe_payment_intent_id,
          stripe_payment_method_id,
          payment_methods!inner(is_online)
        )
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

    console.log("Booking: ", booking);

    // Send cancellation policy notification emails
    await sendCancellationPolicyEmails(booking, cancellationReason, chargeAmount, chargePercentage, booking.professional_profiles);

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

  // Helper to convert IANA timezone to abbreviation using Intl.DateTimeFormat
  function ianaToAbbreviation(iana: string | undefined): string {
    if (!iana) return '';
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        timeZoneName: 'short'
      });
      const parts = dtf.formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart?.value || '';
    } catch {
      return '';
    }
  }

  // Get timezones
  const professionalTimezone = (booking.professional_profiles as any)?.timezone;
  const clientTimezone = (booking.clients as any)?.client_profiles?.[0]?.timezone || (booking.clients as any)?.client_profiles?.timezone;

  // Address not needed for no-show email templates

  const dateTime = `${appointmentDate} ${appointmentTime}`;
  const serviceAmount = booking.booking_services.reduce((sum, bs) => sum + bs.price, 0);
  // No-show emails use the professional's 24hr cancellation percentage
  const policyRate = `${(booking.professional_profiles as any)?.cancellation_24h_charge_percentage || 0}%`;
  
  // Create services array from booking services
  const services = booking.booking_services.map(bs => ({
    duration: bs.duration,
    name: bs.services?.name || 'Unknown Service',
    price: bs.price
  }));

  const clientParams = {
    booking_id: booking.id,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    fee: chargeAmount,
    message_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`,
    policy_rate: policyRate,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    service_amount: serviceAmount,
    services_page_url: `${process.env.NEXT_PUBLIC_BASE_URL}/services`,
    timezone: ianaToAbbreviation(clientTimezone),
    services
  };
  const professionalParams = {
    booking_id: booking.id,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    fee: chargeAmount,
    policy_rate: policyRate,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    service_amount: serviceAmount,
    timezone: ianaToAbbreviation(professionalTimezone),
    services
  };

  await Promise.all([
    sendBookingCancellationNoShowClient(
      [{ email: clientUser.email, name: `${clientUser.first_name} ${clientUser.last_name}` }],
      clientParams
    ),
    sendBookingCancellationNoShowProfessional(
      [{ email: professionalUser.email, name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      professionalParams
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
  chargePercentage: number,
  professionalProfile?: ProfessionalProfile
): Promise<void> {
  // Use Supabase admin client for reliable user data
  const adminSupabase = createSupabaseAdminClient();
  const appointment = booking.appointments[0];
  if (!appointment) throw new Error('Appointment not found');

  // Fetch client and professional user auth data for emails
  const { data: clientAuth } = await adminSupabase.auth.admin.getUserById(booking.clients.id);
  const { data: professionalAuth } = await adminSupabase.auth.admin.getUserById(booking.professional_profiles.users.id);

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
    website_url: process.env.NEXT_PUBLIC_BASE_URL || '',
    support_email: process.env.BREVO_ADMIN_EMAIL || 'support@yourdomain.com'
  };

  let timeDescription = '';
  if (chargePercentage === 0) {
    timeDescription = 'More than 48 hours';
  } else if (professionalProfile && chargePercentage === professionalProfile.cancellation_24h_charge_percentage) {
    timeDescription = 'Less than 24 hours';
  } else if (professionalProfile && chargePercentage === professionalProfile.cancellation_48h_charge_percentage) {
    timeDescription = 'Less than 48 hours';
  }

  let professionalAddress = '';
  if (professionalProfile?.address) {
    const addr = professionalProfile.address;
    professionalAddress = [
      addr.street_address,
      addr.apartment,
      addr.city,
      addr.state,
      addr.country
    ].filter(Boolean).join(', ');
  }

  // Helper to convert IANA timezone to abbreviation using Intl.DateTimeFormat
  function ianaToAbbreviation(iana: string | undefined): string {
    if (!iana) return '';
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        timeZoneName: 'short'
      });
      const parts = dtf.formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart?.value || '';
    } catch {
      return '';
    }
  }

  // Get timezones
  const professionalTimezone = (professionalProfile as any)?.timezone;
  const clientTimezone = (clientUser as any)?.client_profiles?.[0]?.timezone || (clientUser as any)?.client_profiles?.timezone;

  // Create services array from booking services
  const services = booking.booking_services.map(bs => ({
    duration: bs.duration,
    name: bs.services?.name || 'Unknown Service',
    price: bs.price
  }));

  const clientParams = {
    address: professionalAddress,
    cancellation_reason: reason,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: `${appointmentDate} ${appointmentTime}`,
    fee: chargeAmount,
    policy_rate: `${chargePercentage}%`,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    service_amount: serviceAmount,
    time_until_appointment: timeDescription,
    timezone: ianaToAbbreviation(clientTimezone),
    services,
    ...baseParams
  };
  const professionalParams = {
    address: professionalAddress,
    cancellation_reason: reason,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: `${appointmentDate} ${appointmentTime}`,
    fee: chargeAmount,
    policy_rate: `${chargePercentage}%`,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    service_amount: serviceAmount,
    time_until_appointment: timeDescription,
    timezone: ianaToAbbreviation(professionalTimezone),
    services,
    ...baseParams
  };

  // Use admin user emails for recipients
  await Promise.all([
    sendBookingCancellationLessthan24h48hclient(
      [{ email: clientAuth.user?.email || clientUser.email || '', name: `${clientUser.first_name} ${clientUser.last_name}` }],
      clientParams
    ),
    sendBookingCancellationLessthan24h48hprofessional(
      [{ email: professionalAuth.user?.email || professionalUser.email || '', name: `${professionalUser.first_name} ${professionalUser.last_name}` }],
      professionalParams
    )
  ]);
}

/**
 * Send appointment completion emails to both client and professional (2h after completion)
 */

export async function sendAppointmentCompletedEmails(
  appointment: AppointmentQueryResult
): Promise<void> {
  const booking = appointment.bookings as BookingQueryResult;
  if (!booking) throw new Error('Booking not found');

  // Use runtime checks to ensure properties exist
  const professionalProfile = booking.professional_profiles as ProfessionalProfile;
  const professionalUser = professionalProfile?.users;
  const clientUser = booking.clients;

  // Get timezone safely
  const professionalTimezone = professionalProfile?.timezone;
  const clientProfiles = clientUser?.client_profiles as Array<{ timezone?: string }> | undefined;
  const clientTimezone = clientProfiles && Array.isArray(clientProfiles)
    ? clientProfiles[0]?.timezone
    : undefined;

  const { dateTime } = getAppointmentDateTime(appointment);
  const serviceAmount = getServiceAmount(booking);
  const totalPaid = booking.booking_payments?.[0]?.amount || 0;
  const paymentMethod = booking.booking_payments?.[0]?.payment_methods?.name || '';

  // Create services array from booking services
  const services = booking.booking_services?.map(bs => ({
    duration: bs.duration,
    name: bs.services?.name || 'Unknown Service',
    price: bs.price
  })) || [];

  const clientParams: AppointmentCompletion2hafterClientParams = {
    booking_id: booking.id,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    review_tip_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointment.id}?showReviewPrompt=true`,
    service_amount: serviceAmount,
    timezone: getTimezoneAbbreviation(clientTimezone),
    total_paid: totalPaid,
    services
  };

  const professionalParams: AppointmentCompletion2hafterProfessionalParams = {
    booking_id: booking.id,
    client_name: `${clientUser.first_name} ${clientUser.last_name}`,
    date_time: dateTime,
    payment_method: paymentMethod,
    professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
    service_amount: serviceAmount,
    timezone: getTimezoneAbbreviation(professionalTimezone),
    total_amount: totalPaid,
    services
  };

  await Promise.all([
    sendAppointmentCompletion2hafterClient(
      [getRecipient(clientUser)],
      clientParams
    ),
    sendAppointmentCompletion2hafterProfessional(
      [getRecipient(professionalUser)],
      professionalParams
    )
  ]);
}

// --- Shared utility functions for email param construction ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getProfessionalAddress(profile: ProfessionalProfile | { address?: ProfessionalProfile["address"] }): string {
  if (!profile?.address) return '';
  const addr = profile.address;
  return [
    addr.street_address,
    addr.apartment,
    addr.city,
    addr.state,
    addr.country
  ].filter(Boolean).join(', ');
}

function getAppointmentDateTime(appointment: AppointmentBase | AppointmentQueryResult): { dateTime: string } {
  const date = new Date(appointment.start_time).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const time = new Date(appointment.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return { dateTime: `${date} ${time}` };
}

function getTimezoneAbbreviation(iana: string | undefined): string {
  if (!iana) return '';
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'short'
    });
    const parts = dtf.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

function getServiceAmount(booking: BookingQueryResult | AppointmentQueryResult["bookings"]): number {
  return booking.booking_services?.reduce((sum: number, bs: BookingService) => sum + bs.price, 0) || 0;
}

function getRecipient(user: { email: string; first_name: string; last_name: string }): { email: string; name: string } {
  return { email: user.email, name: `${user.first_name} ${user.last_name}` };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getBaseAppointmentParams(
  appointment: AppointmentBase | AppointmentQueryResult
): {
  appointment_id: string;
  appointment_details_url: string;
  date: string;
  time: string;
  website_url: string;
  support_email: string;
} {
  const dateObj = new Date(appointment.start_time);
  const date = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const time = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return {
    appointment_id: appointment.id,
    appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/bookings/${appointment.id}`,
    date,
    time,
    website_url: process.env.NEXT_PUBLIC_BASE_URL || '',
    support_email: process.env.BREVO_ADMIN_EMAIL || ''
  };
}