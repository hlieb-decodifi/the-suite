'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

// Type for appointment permission check through bookings
type AppointmentWithBooking = {
  id: string;
  booking_id: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    professionals: {
      user_id: string;
    } | null;
  } | null;
};

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  userId: string,
  isProfessional: boolean,
) {
  try {
    const supabase = await createClient();

    // First verify that the user has permission to update this appointment
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_id,
        bookings!booking_id(
          id,
          client_id,
          professional_profile_id,
          professionals:professional_profile_id(
            user_id
          )
        )
        `,
      )
      .eq('id', appointmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
    }

    const appointmentData = data as AppointmentWithBooking;

    // Check if user has permission (is either the professional or client for this appointment)
    let canUpdate = false;

    if (appointmentData?.bookings) {
      if (
        isProfessional &&
        appointmentData.bookings.professionals &&
        appointmentData.bookings.professionals.user_id === userId
      ) {
        canUpdate = true;
      } else if (
        !isProfessional &&
        appointmentData.bookings.client_id === userId
      ) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      throw new Error('You do not have permission to update this appointment');
    }

    // Update the appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update appointment status',
    };
  }
}

export type AddAdditionalServicesParams = {
  appointmentId: string;
  additionalServiceIds: string[];
  professionalUserId: string;
};

export type AddAdditionalServicesResult = {
  success: boolean;
  error?: string;
  newTotal?: number;
  servicesAdded?: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;
};

/**
 * Add additional services to an existing appointment
 * This function:
 * 1. Validates the appointment belongs to the professional
 * 2. Adds the new services to booking_services
 * 3. Updates payment amounts
 * 4. For card payments: Updates the uncaptured Stripe payment intent
 * 5. For cash payments: Updates database amount for cash collection
 */
export async function addAdditionalServices({
  appointmentId,
  additionalServiceIds,
  professionalUserId,
}: AddAdditionalServicesParams): Promise<AddAdditionalServicesResult> {
  try {
    console.log('[addAdditionalServices] Starting with params:', {
      appointmentId,
      additionalServiceIds,
      professionalUserId,
    });

    const supabase = await createClient();

    // First, verify the appointment belongs to this professional
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        booking_id,
        bookings!booking_id(
          id,
          professional_profile_id,
          booking_payments(
            id,
            amount,
            tip_amount,
            stripe_payment_intent_id,
            payment_methods(
              id,
              name,
              is_online
            )
          ),
          professionals:professional_profile_id(
            id,
            user_id,
            stripe_account_id
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('[addAdditionalServices] Appointment fetch error:', appointmentError);
      return {
        success: false,
        error: 'Appointment not found',
      };
    }

    console.log('[addAdditionalServices] Fetched appointment data:', {
      appointmentId: appointment.id,
      bookingId: appointment.booking_id,
      bookingPayments: appointment.bookings?.booking_payments,
    });

    const booking = appointment.bookings;
    if (!booking || !booking.professionals) {
      console.error('[addAdditionalServices] Invalid booking data:', { booking });
      return {
        success: false,
        error: 'Invalid appointment data',
      };
    }

    // Verify professional ownership
    if (booking.professionals.user_id !== professionalUserId) {
      console.error('[addAdditionalServices] Authorization failed:', {
        expectedUserId: booking.professionals.user_id,
        actualUserId: professionalUserId,
      });
      return {
        success: false,
        error: 'Not authorized to modify this appointment',
      };
    }

    // Get the additional services details
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .in('id', additionalServiceIds)
      .eq('professional_profile_id', booking.professionals.id);

    if (servicesError || !services || services.length !== additionalServiceIds.length) {
      console.error('[addAdditionalServices] Services fetch error:', {
        error: servicesError,
        servicesFound: services?.length,
        servicesRequested: additionalServiceIds.length,
      });
      return {
        success: false,
        error: 'Some services not found or not owned by professional',
      };
    }

    console.log('[addAdditionalServices] Retrieved services:', services);

    // Calculate additional amount
    const additionalAmount = services.reduce((total, service) => total + service.price, 0);
    const additionalAmountCents = Math.round(additionalAmount * 100);

    console.log('[addAdditionalServices] Calculated amounts:', {
      additionalAmount,
      additionalAmountCents,
    });

    // Add services to booking_services using service role client to bypass RLS
    const bookingServicesData = services.map(service => ({
      booking_id: booking.id,
      service_id: service.id,
      price: service.price,
      duration: service.duration,
    }));

    const { error: insertError } = await supabase
      .from('booking_services')
      .insert(bookingServicesData);

    if (insertError) {
      console.error('[addAdditionalServices] Insert error:', insertError);
      return {
        success: false,
        error: `Failed to add services to booking: ${insertError.message}`,
      };
    }

    console.log('[addAdditionalServices] Successfully inserted booking services:', bookingServicesData);

    const bookingPayment = booking.booking_payments;
    if (!bookingPayment) {
      console.error('[addAdditionalServices] No booking payment found for booking:', booking.id);
      return {
        success: false,
        error: 'No payment found for this booking',
      };
    }

    const currentAmountCents = Math.round(bookingPayment.amount * 100);
    const newTotalCents = currentAmountCents + additionalAmountCents;
    const newTotalDollars = newTotalCents / 100;

    console.log('[addAdditionalServices] Payment amount calculations:', {
      currentAmount: bookingPayment.amount,
      currentAmountCents,
      additionalAmountCents,
      newTotalCents,
      newTotalDollars,
    });

    // Update the booking payment amount
    const { error: updatePaymentError, data: updatedPayment } = await supabase
      .from('booking_payments')
      .update({
        amount: newTotalDollars,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingPayment.id);

    console.log('[addAdditionalServices] Updated payment:', updatedPayment);

    if (updatePaymentError) {
      console.error('[addAdditionalServices] Payment update error:', updatePaymentError);
      return {
        success: false,
        error: 'Failed to update payment amount',
      };
    }

    console.log('[addAdditionalServices] Successfully updated booking payment:', {
      paymentId: bookingPayment.id,
      newAmount: newTotalDollars,
    });

    // Handle Stripe payment updates
    const paymentMethod = bookingPayment.payment_methods;
    const isCardPayment = paymentMethod?.is_online === true;

    if (isCardPayment && bookingPayment.stripe_payment_intent_id) {
      console.log('[addAdditionalServices] Updating Stripe payment intent:', {
        paymentIntentId: bookingPayment.stripe_payment_intent_id,
        newAmount: newTotalCents,
      });

      // For card payments, update the existing uncaptured payment intent
      try {
        await stripe.paymentIntents.update(bookingPayment.stripe_payment_intent_id, {
          amount: newTotalCents,
          metadata: {
            additional_services_added: 'true',
            additional_amount: additionalAmountCents.toString(),
          },
        });

        console.log('[addAdditionalServices] Successfully updated Stripe payment intent');
      } catch (stripeError) {
        console.error('[addAdditionalServices] Stripe payment intent update error:', stripeError);
        return {
          success: false,
          error: 'Failed to update payment intent',
        };
      }
    } else {
      // For cash payments, we just update the database
      console.log('[addAdditionalServices] Cash payment - additional amount to be collected:', {
        additionalAmount: additionalAmountCents / 100,
      });
    }

    console.log('[addAdditionalServices] Operation completed successfully:', {
      newTotal: newTotalDollars,
      servicesAdded: services.length,
    });

    return {
      success: true,
      newTotal: newTotalDollars,
      servicesAdded: services.map(service => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
      })),
    };

  } catch (error) {
    console.error('[addAdditionalServices] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
} 