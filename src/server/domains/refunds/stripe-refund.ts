import Stripe from 'stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { 
  sendSupportRequestRefundedClient,
  sendSupportRequestRefundedProfessional
} from '@/providers/brevo/templates';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Process a refund through Stripe for a support request
 * @param supportRequestId The ID of the support request
 * @param refundAmount The amount to refund (in cents)
 * @returns Success status and error message if applicable
 */
export async function processStripeRefund(
  supportRequestId: string,
  refundAmount: number
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  console.log(`[REFUND] Processing refund for support request ${supportRequestId}, amount: ${refundAmount}`);
  
  try {
    const supabase = await createClient();
    console.log(`[REFUND] Supabase client created`);
    
    // Get the support request with payment details
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select(`
        *,
        booking_payment_id,
        booking_id,
        appointments(
          id,
          bookings!inner(
            id,
            booking_payments(
              id,
              stripe_payment_intent_id,
              amount,
              tip_amount,
              status
            )
          )
        )
      `)
      .eq('id', supportRequestId)
      .single();
      
    if (supportRequestError || !supportRequest) {
      console.error('[REFUND] Error fetching support request:', supportRequestError);
      return {
        success: false,
        error: 'Support request not found',
      };
    }
    
    console.log('[REFUND] Support request data retrieved:', JSON.stringify({
      id: supportRequest.id,
      booking_payment_id: supportRequest.booking_payment_id,
      booking_id: supportRequest.booking_id,
      appointment_id: supportRequest.appointment_id,
      has_appointments: !!supportRequest.appointments,
      appointments_count: supportRequest.appointments ? 
        (Array.isArray(supportRequest.appointments) ? supportRequest.appointments.length : 1) : 0
    }));
    
    // Log the full support request structure for debugging (with sensitive data removed)
    console.log('[REFUND] Full support request structure:', JSON.stringify({
      id: supportRequest.id,
      booking_payment_id: supportRequest.booking_payment_id,
      booking_id: supportRequest.booking_id,
      appointment_id: supportRequest.appointment_id,
      appointments: supportRequest.appointments ? 'exists' : null,
      keys: Object.keys(supportRequest)
    }));
    
    // Get the payment details
    let paymentIntentId: string | null = null;
    let bookingPaymentId: string | null = null;
    
    // First try to get from booking_payment_id if available
    if (supportRequest.booking_payment_id) {
      console.log(`[REFUND] Trying to get payment details from booking_payment_id: ${supportRequest.booking_payment_id}`);
      
      const { data: payment, error: paymentError } = await supabase
        .from('booking_payments')
        .select('*')
        .eq('id', supportRequest.booking_payment_id)
        .single();
      
      if (paymentError) {
        console.error('[REFUND] Error fetching payment details:', paymentError);
      }
        
      if (payment) {
        // Use type assertion to access the fields
        const paymentData = payment as { 
          stripe_payment_intent_id?: string;
          id: string;
        };
        paymentIntentId = paymentData.stripe_payment_intent_id || null;
        bookingPaymentId = paymentData.id;
        console.log(`[REFUND] Found payment intent ID from booking_payment: ${paymentIntentId || 'NOT FOUND'}`);
        console.log('[REFUND] Payment details:', JSON.stringify({
          id: payment.id,
          stripe_payment_intent_id: paymentData.stripe_payment_intent_id,
          amount: payment.amount,
          status: payment.status
        }));
      } else {
        console.log('[REFUND] No payment found with this booking_payment_id');
      }
    } else {
      console.log('[REFUND] No booking_payment_id available in support request');
    }
    
    // Try to get from booking_id if available and no payment intent found yet
    if (!paymentIntentId && supportRequest.booking_id) {
      console.log(`[REFUND] Trying to get payment details from booking_id: ${supportRequest.booking_id}`);
      
      const { data: bookingPayments, error: bookingPaymentsError } = await supabase
        .from('booking_payments')
        .select('*')
        .eq('booking_id', supportRequest.booking_id)
        .order('created_at', { ascending: false });
      
      if (bookingPaymentsError) {
        console.error('[REFUND] Error fetching booking payments:', bookingPaymentsError);
      } else if (bookingPayments && bookingPayments.length > 0) {
        const payment = bookingPayments[0];
        if (payment) {
          paymentIntentId = payment.stripe_payment_intent_id || null;
          bookingPaymentId = payment.id;
          console.log(`[REFUND] Found payment intent ID from booking: ${paymentIntentId || 'NOT FOUND'}`);
          console.log('[REFUND] Payment details:', JSON.stringify({
            id: payment.id,
            stripe_payment_intent_id: payment.stripe_payment_intent_id,
            amount: payment.amount,
            status: payment.status
          }));
        }
      } else {
        console.log('[REFUND] No payments found for this booking');
      }
    }

    // If still not found, try to get from appointments relation
    if (!paymentIntentId && supportRequest.appointments) {
      console.log('[REFUND] Trying to get payment intent from appointments relation');
      
      // Use type assertion to safely access nested properties
      const appointmentsData = supportRequest.appointments as unknown;
      const appointmentsObj = appointmentsData as { 
        bookings?: Array<{ 
          booking_payments?: Array<{ 
            stripe_payment_intent_id?: string;
            id: string;
          }> 
        }> 
      };
      
      console.log('[REFUND] Appointments data structure:', JSON.stringify({
        has_bookings: !!appointmentsObj?.bookings,
        bookings_count: appointmentsObj?.bookings?.length || 0,
        first_booking_has_payments: !!appointmentsObj?.bookings?.[0]?.booking_payments,
        payment_count: appointmentsObj?.bookings?.[0]?.booking_payments?.length || 0
      }));
      
      if (appointmentsObj?.bookings?.[0]?.booking_payments?.[0]) {
        const payment = appointmentsObj.bookings[0].booking_payments[0];
        paymentIntentId = payment.stripe_payment_intent_id || null;
        bookingPaymentId = payment.id;
        console.log(`[REFUND] Found payment intent ID from appointments relation: ${paymentIntentId || 'NOT FOUND'}`);
      } else {
        console.log('[REFUND] No payment found in appointments relation');
      }
    } else if (!paymentIntentId && !supportRequest.appointments) {
      console.log('[REFUND] No appointments data available in support request');
    }
    
    // Final fallback: if we have appointment_id but still no payment, query directly
    if (!paymentIntentId && supportRequest.appointment_id) {
      console.log(`[REFUND] Final attempt: querying payment by appointment_id: ${supportRequest.appointment_id}`);
      
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          bookings (
            id,
            booking_payments (
              id,
              stripe_payment_intent_id,
              amount,
              status
            )
          )
        `)
        .eq('id', supportRequest.appointment_id)
        .single();
        
      if (appointmentError) {
        console.error('[REFUND] Error fetching appointment data:', appointmentError);
      } else if (appointmentData) {
        // Safely access the nested data
        const bookings = appointmentData.bookings as unknown as Array<{
          id: string;
          booking_payments: Array<{
            id: string;
            stripe_payment_intent_id: string | null;
            amount: number;
            status: string;
          }> | null;
        }>;
        
        if (bookings && bookings.length > 0) {
          const booking = bookings[0];
          if (booking && booking.booking_payments && booking.booking_payments.length > 0) {
            const payment = booking.booking_payments[0];
            if (payment) {
              paymentIntentId = payment.stripe_payment_intent_id || null;
              bookingPaymentId = payment.id;
              console.log(`[REFUND] Found payment intent ID from direct appointment query: ${paymentIntentId || 'NOT FOUND'}`);
            }
          } else {
            console.log('[REFUND] No payment found in direct appointment query');
          }
        } else {
          console.log('[REFUND] No bookings found in appointment data');
        }
      } else {
        console.log('[REFUND] No appointment data found');
      }
    }
    
    if (!paymentIntentId) {
      return {
        success: false,
        error: 'No payment information found for this support request',
      };
    }
    
    // Convert amount to cents for Stripe
    const refundAmountCents = Math.round(refundAmount * 100);
    console.log(`[REFUND] Refund amount in cents: ${refundAmountCents}`);
    
    // Create the refund in Stripe
    let refund: Stripe.Refund;
    
    if (paymentIntentId) {
      console.log(`[REFUND] Attempting to create refund with payment intent: ${paymentIntentId}`);
      
      try {
        // Refund by payment intent
        refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refundAmountCents,
          metadata: {
            support_request_id: supportRequestId,
          },
        });
        
        console.log(`[REFUND] Refund created successfully:`, JSON.stringify({
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          payment_intent: refund.payment_intent
        }));
      } catch (stripeError) {
        console.error('[REFUND] Stripe refund creation error:', stripeError);
        return {
          success: false,
          error: stripeError instanceof Error ? stripeError.message : 'Error creating refund in Stripe',
        };
      }
    } else {
      console.error('[REFUND] No valid payment identifier found');
  return {
    success: false,
        error: 'No valid payment identifier found',
      };
    }
    
    // Update the support request with refund information
    console.log(`[REFUND] Updating support request with refund ID: ${refund.id} and status: ${refund.status || 'unknown'}`);
    
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({
        stripe_refund_id: refund.id,
        refund_status: refund.status || 'unknown',
      })
      .eq('id', supportRequestId);
      
    if (updateError) {
      console.error('[REFUND] Error updating support request with refund ID:', updateError);
      // We don't return an error here as the refund was created successfully
    } else {
      console.log('[REFUND] Support request updated successfully with refund information');
    }
    
    // Update the booking_payment with refund information
    if (bookingPaymentId) {
      console.log(`[REFUND] Updating booking payment ${bookingPaymentId} with refund data`);
      
      const refundAmountDollars = refund.amount ? refund.amount / 100 : refundAmount;
      
      const { error: paymentUpdateError } = await supabase
        .from('booking_payments')
        .update({
          status: 'refunded', // Set status to 'refunded'
          refunded_amount: refundAmountDollars,
          refund_reason: 'Support request refund',
          refunded_at: new Date().toISOString(),
          refund_transaction_id: refund.id,
        })
        .eq('id', bookingPaymentId);
        
      if (paymentUpdateError) {
        console.error('[REFUND] Error updating booking payment with refund data:', paymentUpdateError);
      } else {
        console.log(`[REFUND] Successfully updated booking payment ${bookingPaymentId} with refund data`);
      }
    } else {
      console.log('[REFUND] No booking payment ID found to update with refund information');
    }
    
    console.log('[REFUND] Process completed successfully');
    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error) {
    console.error('[REFUND] Error processing refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get the status of a Stripe refund
 * @param refundId The ID of the refund to check
 * @returns The refund status and amount
 */
export async function getStripeRefundStatus(refundId: string): Promise<{ 
  status?: string; 
  amount?: number;
  error?: string;
}> {
  console.log(`[REFUND_STATUS] Checking status for refund ID: ${refundId}`);
  
  try {
    // Retrieve the refund from Stripe
    const refund = await stripe.refunds.retrieve(refundId);
    
    // Convert amount from cents to dollars
    const amountInDollars = refund.amount ? refund.amount / 100 : undefined;
    
    console.log(`[REFUND_STATUS] Retrieved refund status: ${refund.status}, amount: ${amountInDollars}`);
    // Log detailed info for debugging
    console.log(`[REFUND_STATUS] Details:`, JSON.stringify({
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
      payment_intent: refund.payment_intent
    }));
    
    return {
      status: refund.status || 'unknown',
      ...(amountInDollars !== undefined && { amount: amountInDollars }),
    };
  } catch (error) {
    console.error('[REFUND_STATUS] Error getting refund status:', error);
  return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle Stripe refund webhook events
 * @param refund The refund object from Stripe
 * @returns Success status
 */
export async function handleStripeRefundWebhook(refund: Stripe.Refund): Promise<{ success: boolean; error?: string }> {
  console.log(`[WEBHOOK] Processing refund webhook event for refund ID: ${refund.id}, status: ${refund.status}`);
  console.log(`[WEBHOOK] Refund metadata:`, JSON.stringify(refund.metadata || {}));
  
  try {
    const supabase = await createClient();
    
    // Get the support request ID from the refund metadata
    const supportRequestId = refund.metadata?.support_request_id;
    const paymentIntentId = refund.payment_intent as string;
    
    // First try to find support request by ID from metadata
    if (supportRequestId) {
      console.log(`[WEBHOOK] Found support request ID in metadata: ${supportRequestId}`);
      
      // Get the support request
      const { data: supportRequest, error: supportRequestError } = await supabase
        .from('support_requests')
        .select('*')
        .eq('id', supportRequestId)
        .single();
        
      if (!supportRequestError && supportRequest) {
        return await updateSupportRequestWithRefund(supabase as SupabaseClient<Database>, supportRequest, refund);
      } else {
        console.log('[WEBHOOK] Support request not found by ID, trying to find by payment intent');
      }
    } else {
      console.log('[WEBHOOK] No support request ID in refund metadata, trying to find by payment intent');
    }
    
    // If we couldn't find by ID or no ID was provided, try to find by payment intent
    if (paymentIntentId) {
      console.log(`[WEBHOOK] Looking up support request by payment intent ID: ${paymentIntentId}`);
      
      // First get the booking payment by payment intent ID
      const { data: bookingPayment, error: bookingPaymentError } = await supabase
        .from('booking_payments')
        .select('id, booking_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();
        
      if (bookingPaymentError || !bookingPayment) {
        console.log(`[WEBHOOK] No booking payment found for payment intent ID: ${paymentIntentId}`);
      } else {
        console.log(`[WEBHOOK] Found booking payment ID: ${bookingPayment.id} for booking: ${bookingPayment.booking_id}`);
        
        // Try to find support request by booking ID
        const { data: supportRequests, error: supportRequestsError } = await supabase
          .from('support_requests')
          .select('*')
          .eq('booking_id', bookingPayment.booking_id)
          .order('created_at', { ascending: false });
          
        if (supportRequestsError || !supportRequests || supportRequests.length === 0) {
          console.log(`[WEBHOOK] No support requests found for booking ID: ${bookingPayment.booking_id}`);
        } else {
          // Use the most recent support request
          const supportRequest = supportRequests[0];
          if (supportRequest) {
            console.log(`[WEBHOOK] Found support request by booking ID: ${supportRequest.id}`);
            
            // Update the booking payment with refund data
            await updateBookingPaymentWithRefund(supabase as SupabaseClient<Database>, bookingPayment.id, refund);
            
            return await updateSupportRequestWithRefund(supabase as SupabaseClient<Database>, supportRequest, refund);
          } else {
            console.log(`[WEBHOOK] Support request array exists but first element is undefined`);
          }
        }
        
        // Even if we don't find a support request, update the booking payment
        await updateBookingPaymentWithRefund(supabase as SupabaseClient<Database>, bookingPayment.id, refund);
      }
    }
    
    console.log('[WEBHOOK] Could not find related support request for this refund');
    return { success: true }; // Still return success as we've processed what we could
  } catch (error) {
    console.error('[WEBHOOK] Error handling refund webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Helper function to update support request with refund data
async function updateSupportRequestWithRefund(
  supabase: SupabaseClient<Database>,
  supportRequest: {
    id: string;
    professional_id: string | null;
    conversation_id: string | null;
    status: string;
  },
  refund: Stripe.Refund
): Promise<{ success: boolean; error?: string }> {
  console.log(`[WEBHOOK] Updating support request: ${supportRequest.id}, current status: ${supportRequest.status}`);
  
  // Update the support request with the refund status
  const updates: Record<string, string | null> = {
    refund_status: refund.status,
  };
  
  // If the refund succeeded, mark the support request as resolved
  if (refund.status === 'succeeded') {
    updates.status = 'resolved';
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = supportRequest.professional_id;
    updates.resolution_notes = 'Refund processed successfully';
    console.log('[WEBHOOK] Refund succeeded, marking support request as resolved');
    
    // Add a success message to the conversation
    if (supportRequest.conversation_id && supportRequest.professional_id) {
      const refundAmountDollars = (refund.amount || 0) / 100;
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: supportRequest.professional_id,
        content: `Refund of $${refundAmountDollars.toFixed(2)} has been successfully processed.`,
        is_read: false,
      });
      
      if (messageError) {
        console.error('[WEBHOOK] Error creating refund success message:', messageError);
      } else {
        console.log('[WEBHOOK] Success message added to conversation');
      }
    }
    
    // Send refund email notifications if refund succeeded
    if (refund.status === 'succeeded') {
      await sendSupportRequestRefundedEmails(supportRequest.id, (refund.amount || 0) / 100);
    }
  }
  
  console.log(`[WEBHOOK] Updating support request with:`, JSON.stringify(updates));
  
  const { error: updateError } = await supabase
    .from('support_requests')
    .update(updates)
    .eq('id', supportRequest.id);
    
  if (updateError) {
    console.error('[WEBHOOK] Error updating support request with refund status:', updateError);
    return { success: false, error: 'Failed to update support request' };
  }
  
  console.log('[WEBHOOK] Support request updated successfully');
  
  // If the refund failed, add a message to the conversation
  if (refund.status === 'failed' && supportRequest.conversation_id && supportRequest.professional_id) {
    console.log('[WEBHOOK] Refund failed, adding message to conversation');
    
    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: supportRequest.conversation_id,
      sender_id: supportRequest.professional_id,
      content: `Refund failed: ${refund.failure_reason || 'Unknown reason'}. Please try again or contact support.`,
      is_read: false,
    });
    
    if (messageError) {
      console.error('[WEBHOOK] Error creating refund failure message:', messageError);
      // Don't return error as the status update was successful
    } else {
      console.log('[WEBHOOK] Failure message added to conversation');
    }
  }
  
  console.log('[WEBHOOK] Support request webhook processing completed successfully');
  return { success: true };
}

// Helper function to update booking payment with refund data
async function updateBookingPaymentWithRefund(
  supabase: SupabaseClient<Database>,
  bookingPaymentId: string,
  refund: Stripe.Refund
): Promise<void> {
  console.log(`[WEBHOOK] Updating booking payment: ${bookingPaymentId} with refund data`);
  
  try {
    const refundAmountCents = refund.amount || 0;
    const refundAmountDollars = refundAmountCents / 100;
    
    const { error: updateError } = await supabase
      .from('booking_payments')
      .update({
        status: refund.status === 'succeeded' ? 'refunded' : 'refund_pending',
        refunded_amount: refundAmountDollars,
        refund_reason: refund.reason || 'Support request refund',
        refunded_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingPaymentId);
      
    if (updateError) {
      console.error('[WEBHOOK] Error updating booking payment with refund data:', updateError);
    } else {
      console.log(`[WEBHOOK] Successfully updated booking payment ${bookingPaymentId} with refund data`);
    }
  } catch (error) {
    console.error('[WEBHOOK] Error updating booking payment:', error);
  }
}

/**
 * Send support request refunded emails to both client and professional
 */
async function sendSupportRequestRefundedEmails(supportRequestId: string, refundAmount: number) {
  try {
    const adminSupabase = await createAdminClient();

    // Get support request data with appointment, booking and user info
    const { data: supportRequest, error: supportRequestError } = await adminSupabase
      .from('support_requests')
      .select(`
        id,
        booking_id,
        client_id,
        professional_id,
        appointment_id,
        appointments (
          start_time
        ),
        bookings (
          id,
          professional_profile_id,
          clients:users!client_id (
            first_name,
            last_name
          ),
          professional_profiles (
            address:address_id (
              street_address,
              city,
              state,
              country
            ),
            users (
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('id', supportRequestId)
      .single();

    if (supportRequestError || !supportRequest) {
      console.error('Failed to get support request data for email:', supportRequestError);
      return;
    }

    const booking = supportRequest.bookings;
    if (!booking) {
      console.error('Missing booking data');
      return;
    }

    const client = booking.clients;
    const professional = booking.professional_profiles?.users;
    const address = booking.professional_profiles?.address;
    const appointment = supportRequest.appointments;

    if (!client || !professional || !appointment) {
      console.error('Missing required data for refund emails');
      return;
    }

    if (!supportRequest.client_id || !supportRequest.professional_id) {
      console.error('Missing client or professional ID');
      return;
    }

    // Format address
    const formattedAddress = address 
      ? [address.street_address, address.city, address.state, address.country].filter(Boolean).join(', ')
      : '';

    // Format appointment date and time
    const appointmentDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const dateAndTime = `${appointmentDate} at ${appointmentTime}`;

    // Get email addresses using admin client
    const { data: clientAuth, error: clientAuthError } = await adminSupabase.auth.admin.getUserById(supportRequest.client_id);
    const { data: professionalAuth, error: professionalAuthError } = await adminSupabase.auth.admin.getUserById(supportRequest.professional_id);

    if (clientAuthError || !clientAuth.user?.email || professionalAuthError || !professionalAuth.user?.email) {
      console.error('Failed to get email addresses for refund emails');
      return;
    }

    const clientName = `${client.first_name} ${client.last_name}`;
    const professionalName = `${professional.first_name} ${professional.last_name}`;

    // Send emails
    await Promise.all([
      sendSupportRequestRefundedClient(
        [{ email: clientAuth.user.email, name: clientName }],
        {
          address: formattedAddress,
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          date_and_time: dateAndTime,
          professional_name: professionalName,
          refund_amount: refundAmount,
          refund_method: 'Credit Card'
        }
      ),
      sendSupportRequestRefundedProfessional(
        [{ email: professionalAuth.user.email, name: professionalName }],
        {
          address: formattedAddress,
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          date_and_time: dateAndTime,
          professional_name: professionalName,
          refund_amount: refundAmount
        }
      )
    ]);

    console.log('✅ Support request refunded emails sent');
  } catch (error) {
    console.error('❌ Error sending support request refunded emails:', error);
  }
}