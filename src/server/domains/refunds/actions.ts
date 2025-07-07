'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { RefundRequest, RefundDecision } from '@/types/refunds';
import { sendRefundRequestEmail, sendRefundDeclineEmail } from './email-utils';
import { processStripeRefund } from './stripe-refund';

/**
 * Create a refund request from a client
 */
export async function createRefundRequest(
  request: RefundRequest
): Promise<{ success: boolean; refundId?: string; error?: string }> {
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

    // Get appointment details with payment information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        start_time,
        status,
        booking_id,
        bookings!inner(
          id,
          client_id,
          professional_profile_id,
          booking_payments!inner(
            id,
            amount,
            tip_amount,
            status,
            payment_methods!inner(
              is_online
            )
          ),
          booking_services(
            services(
              name
            )
          ),
          professional_profiles!inner(
            user_id
          )
        )
      `)
      .eq('id', request.appointment_id)
      .single();

    if (appointmentError || !appointment) {
      console.error('Appointment error:', appointmentError);
      return {
        success: false,
        error: 'Appointment not found',
      };
    }

    // Check if user can create refund using the database function
    const { data: canCreateRefund, error: canCreateError } = await supabase
      .rpc('can_create_refund', {
        p_appointment_id: request.appointment_id,
        p_client_id: user.id,
      });

    if (canCreateError) {
      console.error('Can create refund error:', canCreateError);
      return {
        success: false,
        error: 'Unable to validate refund eligibility',
      };
    }

    if (!canCreateRefund) {
      return {
        success: false,
        error: 'This appointment is not eligible for a refund request. Refunds are only available for completed appointments paid with card.',
      };
    }

    const booking = appointment.bookings;
    const payment = booking.booking_payments;
    const professionalId = booking.professional_profiles.user_id;

    // Calculate original amount (total payment)
    const originalAmount = payment.amount + payment.tip_amount;

    // Create refund record
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        appointment_id: request.appointment_id,
        client_id: user.id,
        professional_id: professionalId,
        booking_payment_id: payment.id,
        reason: request.reason,
        original_amount: originalAmount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (refundError) {
      console.error('Refund creation error:', refundError);
      return {
        success: false,
        error: 'Failed to create refund request',
      };
    }

    // Send email notification to professional
    try {
      await sendRefundRequestEmail(refund.id);
    } catch (emailError) {
      console.error('Error sending refund notification email:', emailError);
      // Don't fail the refund creation for email issues
    }

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error) {
    console.error('Error creating refund request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process refund decision from professional
 */
export async function processRefundDecision(
  decision: RefundDecision
): Promise<{ success: boolean; error?: string }> {
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

    // Get refund details to verify professional ownership
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select(`
        id,
        appointment_id,
        client_id,
        professional_id,
        booking_payment_id,
        original_amount,
        status,
        stripe_refund_id
      `)
      .eq('id', decision.refund_id)
      .single();

    if (refundError || !refund) {
      return {
        success: false,
        error: 'Refund request not found',
      };
    }

    // Verify the user is the professional for this refund
    if (refund.professional_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check if refund is still pending
    if (refund.status !== 'pending') {
      return {
        success: false,
        error: 'This refund request has already been processed',
      };
    }

    if (decision.status === 'declined') {
      // Update refund to declined status
      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'declined',
          declined_reason: decision.declined_reason || null,
          professional_notes: decision.professional_notes || null,
        })
        .eq('id', decision.refund_id);

      if (updateError) {
        console.error('Error declining refund:', updateError);
        return {
          success: false,
          error: 'Failed to decline refund request',
        };
      }

      // Send decline notification email
      try {
        await sendRefundDeclineEmail(decision.refund_id);
      } catch (emailError) {
        console.error('Error sending decline notification:', emailError);
        // Don't fail for email issues
      }

      return { success: true };
    } else if (decision.status === 'approved') {
      // Validate requested amount
      if (!decision.requested_amount || decision.requested_amount <= 0 || decision.requested_amount > refund.original_amount) {
        return {
          success: false,
          error: 'Invalid refund amount',
        };
      }

      // Update refund to approved status
      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'approved',
          requested_amount: decision.requested_amount,
          professional_notes: decision.professional_notes || null,
        })
        .eq('id', decision.refund_id);

      if (updateError) {
        console.error('Error approving refund:', updateError);
        return {
          success: false,
          error: 'Failed to approve refund request',
        };
      }

      // Process the actual refund with Stripe
      try {
        const stripeResult = await processStripeRefund(decision.refund_id, decision.requested_amount);
        
        if (!stripeResult.success) {
          // Revert the refund status if Stripe processing failed
          await supabase
            .from('refunds')
            .update({
              status: 'failed',
            })
            .eq('id', decision.refund_id);

          return {
            success: false,
            error: stripeResult.error || 'Failed to process refund payment',
          };
        }
      } catch (stripeError) {
        console.error('Error processing Stripe refund:', stripeError);
        
        // Revert the refund status
        await supabase
          .from('refunds')
          .update({
            status: 'failed',
          })
          .eq('id', decision.refund_id);

        return {
          success: false,
          error: 'Failed to process refund payment',
        };
      }

      return { success: true };
    } else {
      return {
        success: false,
        error: 'Invalid decision status',
      };
    }
  } catch (error) {
    console.error('Error processing refund decision:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get refund details for professional review
 */
export async function getRefundForReview(
  refundId: string
): Promise<{ success: boolean; refund?: RefundWithDetails; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/auth/signin');
    }

    // Get refund details with all related information
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select(`
        id,
        appointment_id,
        client_id,
        professional_id,
        booking_payment_id,
        reason,
        requested_amount,
        original_amount,
        transaction_fee,
        refund_amount,
        status,
        professional_notes,
        declined_reason,
        processed_at,
        created_at,
        updated_at,
        appointments!inner(
          id,
          date,
          start_time,
          end_time,
          booking_id,
          bookings!inner(
            id,
            notes,
            booking_services(
              id,
              price,
              duration,
              services(
                name,
                description
              )
            ),
            booking_payments!inner(
              id,
              amount,
              tip_amount,
              status,
              payment_methods(
                name,
                is_online
              )
            )
          )
        ),
        clients:users!client_id(
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', refundId)
      .single();

    if (refundError || !refund) {
      return {
        success: false,
        error: 'Refund request not found',
      };
    }

    // Verify the user is the professional for this refund
    if (refund.professional_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized access to this refund request',
      };
    }

    return {
      success: true,
      refund: refund as RefundWithDetails,
    };
  } catch (error) {
    console.error('Error getting refund for review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type RefundWithDetails = {
  id: string;
  appointment_id: string;
  client_id: string;
  professional_id: string;
  booking_payment_id: string;
  reason: string;
  requested_amount: number | null;
  original_amount: number;
  transaction_fee: number;
  refund_amount: number | null;
  status: string;
  professional_notes: string | null;
  declined_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  appointments: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    booking_id: string;
    bookings: {
      id: string;
      notes: string | null;
      booking_services: Array<{
        id: string;
        price: number;
        duration: number;
        services: {
          name: string;
          description: string | null;
        };
      }>;
      booking_payments: {
        id: string;
        amount: number;
        tip_amount: number;
        status: string;
        payment_methods: {
          name: string;
          is_online: boolean;
        };
      };
    };
  };
  clients: {
    id: string;
    first_name: string;
    last_name: string;
  };
}; 