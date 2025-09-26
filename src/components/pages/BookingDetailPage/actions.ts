'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

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
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = createAdminClient();

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

    // Update the appointment status using admin client since RLS policy was removed
    const { error: updateError } = await adminSupabase
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
          client_id,
          professional_profile_id,
          booking_payments(
            id,
            amount,
            tip_amount,
            deposit_amount,
            balance_amount,
            stripe_payment_intent_id,
            stripe_payment_method_id,
            payment_methods(
              id,
              name,
              is_online
            )
          ),
          professionals:professional_profile_id(
            id,
            user_id,
            professional_stripe_connect(
              stripe_account_id
            )
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

    // Check which services are already added to this booking to prevent duplicates
    const { data: existingServices, error: existingServicesError } = await supabase
      .from('booking_services')
      .select('service_id')
      .eq('booking_id', booking.id);

    if (existingServicesError) {
      console.error('[addAdditionalServices] Error checking existing services:', existingServicesError);
      return {
        success: false,
        error: 'Failed to check existing services for this booking',
      };
    }

    const existingServiceIds = new Set(existingServices?.map(s => s.service_id) || []);
    
    // Filter out services that are already added to this booking
    const newServices = services.filter(service => !existingServiceIds.has(service.id));
    
    if (newServices.length === 0) {
      console.log('[addAdditionalServices] All selected services are already added to this booking');
      return {
        success: false,
        error: 'All selected services have already been added to this booking',
      };
    }

    if (newServices.length < services.length) {
      const duplicateCount = services.length - newServices.length;
      console.log(`[addAdditionalServices] Filtered out ${duplicateCount} duplicate service(s). Processing ${newServices.length} new services.`);
    }

    // Calculate additional amount for NEW services only
    const additionalAmount = newServices.reduce((total, service) => total + service.price, 0);
    const additionalAmountCents = Math.round(additionalAmount * 100);

    console.log('[addAdditionalServices] Calculated amounts (new services only):', {
      additionalAmount,
      additionalAmountCents,
      newServicesCount: newServices.length,
      totalServicesRequested: services.length,
    });

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

    // Handle Stripe payment updates FIRST for card payments
    const paymentMethod = bookingPayment.payment_methods;
    const isCardPayment = paymentMethod?.is_online === true;
    
    // Variable to store new payment intent ID if payment is replaced
    let newPaymentIntentId: string | undefined;

    if (isCardPayment && bookingPayment.stripe_payment_intent_id) {
      console.log('[addAdditionalServices] Processing additional services payment by updating balance payment:', {
        paymentIntentId: bookingPayment.stripe_payment_intent_id,
        originalAmount: currentAmountCents,
        additionalAmount: additionalAmountCents,
        newTotal: newTotalCents,
      });

      try {
        const { processAdditionalServicesBalancePayment } = await import('@/server/domains/stripe-payments/balance-payment-operations');
        
        // Get customer ID and payment method for the replacement
        const { getStripeCustomerId } = await import('@/server/domains/stripe-payments/db');
        const customerId = await getStripeCustomerId(booking.client_id);
        if (!customerId) {
          console.error('[addAdditionalServices] No Stripe customer found for client:', booking.client_id);
          return {
            success: false,
            error: 'Customer not found for payment processing. The client may need to complete a payment first.',
          };
        }

        let paymentMethodId = bookingPayment.stripe_payment_method_id;
        
        // If payment method ID is not stored in database, try to get it from the PaymentIntent
        if (!paymentMethodId) {
          console.log('[addAdditionalServices] Payment method not stored in database, retrieving from PaymentIntent:', bookingPayment.stripe_payment_intent_id);
          
          try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: '2025-04-30.basil',
            });
            
            const paymentIntent = await stripe.paymentIntents.retrieve(bookingPayment.stripe_payment_intent_id);
            
            if (paymentIntent.payment_method) {
              paymentMethodId = typeof paymentIntent.payment_method === 'string' 
                ? paymentIntent.payment_method 
                : paymentIntent.payment_method.id;
              
              console.log('[addAdditionalServices] Retrieved payment method from PaymentIntent:', paymentMethodId);
              
              // Store the payment method ID in the database for future use
              const adminSupabase = createAdminClient();
              await adminSupabase
                .from('booking_payments')
                .update({ stripe_payment_method_id: paymentMethodId })
                .eq('id', bookingPayment.id);
                
              console.log('[addAdditionalServices] Stored payment method ID in database for future use');
            } else {
              console.error('[addAdditionalServices] No payment method attached to PaymentIntent:', bookingPayment.stripe_payment_intent_id);
              return {
                success: false,
                error: 'No payment method found for this booking. Cannot add additional services.',
              };
            }
          } catch (stripeRetrieveError) {
            console.error('[addAdditionalServices] Error retrieving PaymentIntent to get payment method:', stripeRetrieveError);
            return {
              success: false,
              error: 'Failed to retrieve payment information. Cannot add additional services.',
            };
          }
        }
        
        if (!paymentMethodId) {
          console.error('[addAdditionalServices] No payment method found for booking payment:', bookingPayment.id);
          return {
            success: false,
            error: 'No payment method found for this booking. Cannot add additional services.',
          };
        }

        // Get professional Stripe account ID
        const professionalStripeAccountId = booking.professionals?.professional_stripe_connect?.stripe_account_id;
        
        // Replace the existing uncaptured balance payment intent with a new one including additional services
        // For deposit bookings, we should use the original balance amount, not the total amount
        const originalBalanceAmountCents = Math.round((bookingPayment.balance_amount || bookingPayment.amount) * 100);
        
        console.log('[addAdditionalServices] Balance payment amounts:', {
          totalCurrentAmount: currentAmountCents / 100,
          originalBalanceAmount: originalBalanceAmountCents / 100,
          additionalAmount: additionalAmountCents / 100,
          depositAmount: bookingPayment.deposit_amount || 0,
          explanation: bookingPayment.deposit_amount 
            ? 'Using balance_amount since deposit was paid separately' 
            : 'Using total amount since no deposit'
        });
        
        const paymentResult = await processAdditionalServicesBalancePayment({
          balancePaymentIntentId: bookingPayment.stripe_payment_intent_id,
          originalAmount: originalBalanceAmountCents,
          additionalAmount: additionalAmountCents,
          bookingId: booking.id,
          customerId,
          paymentMethodId: paymentMethodId as string,
          ...(professionalStripeAccountId && { professionalStripeAccountId }),
        });

        if (!paymentResult.success) {
          console.error('[addAdditionalServices] Payment replacement failed:', paymentResult.error);
          return {
            success: false,
            error: `Failed to update payment for additional services: ${paymentResult.error}`,
          };
        }

        if (paymentResult.immediatePayment) {
          console.log('[addAdditionalServices] Successfully processed immediate payment for additional services:', {
            originalPaymentIntentId: bookingPayment.stripe_payment_intent_id,
            additionalPaymentIntentId: paymentResult.newPaymentIntentId,
            chargedAmount: paymentResult.updatedAmount ? paymentResult.updatedAmount / 100 : 'unknown',
          });
          // Don't update newPaymentIntentId since we want to keep the original payment intent ID in the database
        } else {
          console.log('[addAdditionalServices] Successfully replaced balance payment:', {
            oldPaymentIntentId: bookingPayment.stripe_payment_intent_id,
            newPaymentIntentId: paymentResult.newPaymentIntentId,
            updatedAmount: paymentResult.updatedAmount ? paymentResult.updatedAmount / 100 : 'unknown',
          });
          // Store the new payment intent ID for database updates and potential rollback
          newPaymentIntentId = paymentResult.newPaymentIntentId;
        }

      } catch (stripeError) {
        console.error('[addAdditionalServices] Stripe operation error:', stripeError);
        return {
          success: false,
          error: stripeError instanceof Error 
            ? `Failed to update payment for additional services: ${stripeError.message}`
            : 'Failed to update payment for additional services',
        };
      }
    }

    // Now that Stripe operations are successful (or not needed), proceed with database updates
    console.log('[addAdditionalServices] Stripe operations completed successfully, proceeding with database updates');

    // Add only the new services to booking_services
    const bookingServicesData = newServices.map(service => ({
      booking_id: booking.id,
      service_id: service.id,
      price: service.price,
      duration: service.duration,
    }));

    console.log('[addAdditionalServices] Adding new services:', {
      totalSelected: services.length,
      newServicesCount: newServices.length,
      serviceIds: newServices.map(s => s.id),
    });

    const { error: insertError } = await supabase
      .from('booking_services')
      .insert(bookingServicesData);

    if (insertError) {
      console.error('[addAdditionalServices] Insert error after Stripe update:', insertError);
      
      // If we already updated Stripe but DB insert fails, we need to rollback Stripe
      if (isCardPayment && bookingPayment.stripe_payment_intent_id) {
        console.log('[addAdditionalServices] Rolling back Stripe payment intent due to database error');
        try {
          const { updatePaymentIntent } = await import('@/server/domains/stripe-payments/stripe-operations');
          
          await updatePaymentIntent(bookingPayment.stripe_payment_intent_id, {
            amount: currentAmountCents, // Revert to original amount
            metadata: {
              additional_services_rollback: 'true',
              rollback_reason: 'database_insert_failed',
            },
          });
          console.log('[addAdditionalServices] Successfully rolled back Stripe payment intent');
        } catch (rollbackError) {
          console.error('[addAdditionalServices] CRITICAL: Failed to rollback Stripe payment intent:', rollbackError);
          // Log this as a critical error that needs manual intervention
        }
      }
      
      return {
        success: false,
        error: `Failed to add services to booking: ${insertError.message}`,
      };
    }

    console.log('[addAdditionalServices] Successfully inserted booking services:', bookingServicesData);

    // Update the booking payment amount, balance_amount, and payment intent ID using admin client (secure payment data handling)
    const adminSupabase = createAdminClient();
    
    // Calculate the new balance amount
    // For deposit payments: balance_amount = original_balance + additional_services (deposit already paid)
    // For non-deposit payments: balance_amount = new_total (since everything needs to be captured)
    const currentDepositAmount = bookingPayment.deposit_amount || 0;
    const originalBalanceAmount = bookingPayment.balance_amount || bookingPayment.amount;
    const newBalanceAmount = currentDepositAmount > 0 
      ? originalBalanceAmount + additionalAmount // If there was a deposit, add additional to original balance
      : newTotalDollars; // If no deposit, entire amount needs to be captured
    
    const paymentUpdateData: {
      amount: number;
      balance_amount: number;
      updated_at: string;
      stripe_payment_intent_id?: string;
    } = {
      amount: newTotalDollars,
      balance_amount: newBalanceAmount,
      updated_at: new Date().toISOString(),
    };
    
    console.log('[addAdditionalServices] Updating payment amounts:', {
      originalTotalAmount: bookingPayment.amount,
      newTotalAmount: newTotalDollars,
      additionalAmount: additionalAmount,
      depositAmount: currentDepositAmount,
      originalBalanceAmount: originalBalanceAmount,
      newBalanceAmount: newBalanceAmount,
      calculation: currentDepositAmount > 0 
        ? `${originalBalanceAmount} + ${additionalAmount} = ${newBalanceAmount} (deposit already paid)`
        : `${newTotalDollars} (no deposit, full amount to capture)`
    });
    
    // If we have a new payment intent ID from the replacement, update it
    if (newPaymentIntentId) {
      paymentUpdateData.stripe_payment_intent_id = newPaymentIntentId;
      console.log('[addAdditionalServices] Updating payment intent ID in database:', {
        oldId: bookingPayment.stripe_payment_intent_id,
        newId: newPaymentIntentId,
      });
    }
    
    const { error: updatePaymentError } = await adminSupabase
      .from('booking_payments')
      .update(paymentUpdateData)
      .eq('id', bookingPayment.id);

    if (updatePaymentError) {
      console.error('[addAdditionalServices] Payment update error after successful inserts:', updatePaymentError);
      
      // Rollback: Delete the inserted services
      console.log('[addAdditionalServices] Rolling back inserted services due to payment update error');
      const { error: deleteError } = await supabase
        .from('booking_services')
        .delete()
        .in('service_id', newServices.map(s => s.id))
        .eq('booking_id', booking.id);
      
      if (deleteError) {
        console.error('[addAdditionalServices] CRITICAL: Failed to rollback inserted services:', deleteError);
      }
      
      // Rollback Stripe if needed
      if (isCardPayment && bookingPayment.stripe_payment_intent_id) {
        console.log('[addAdditionalServices] Rolling back Stripe payment intent due to payment update error');
        try {
          const { updatePaymentIntent } = await import('@/server/domains/stripe-payments/stripe-operations');
          
          await updatePaymentIntent(bookingPayment.stripe_payment_intent_id, {
            amount: currentAmountCents, // Revert to original amount
            metadata: {
              additional_services_rollback: 'true',
              rollback_reason: 'payment_update_failed',
            },
          });
          console.log('[addAdditionalServices] Successfully rolled back Stripe payment intent');
        } catch (rollbackError) {
          console.error('[addAdditionalServices] CRITICAL: Failed to rollback Stripe payment intent:', rollbackError);
        }
      }
      
      return {
        success: false,
        error: 'Failed to update payment amount',
      };
    }

    console.log('[addAdditionalServices] Successfully updated booking payment:', {
      paymentId: bookingPayment.id,
      newAmount: newTotalDollars,
    });

    if (!isCardPayment) {
      // For cash payments, log the additional amount to be collected
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