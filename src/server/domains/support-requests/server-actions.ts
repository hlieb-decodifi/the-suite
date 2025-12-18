'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { processStripeRefund } from '../refunds/stripe-refund';
import { redirect } from 'next/navigation';
import {
  sendSupportRequestCreation,
  sendSupportRequestResolvedClient,
  sendSupportRequestResolvedProfessional,
  sendSupportRequestRefundedClient,
  sendSupportRequestRefundedProfessional,
} from '@/providers/brevo/templates';

/**
 * Create a new support request - Server Action
 */
export async function createSupportRequestAction({
  appointment_id,
  reason,
}: {
  appointment_id: string;
  reason: string;
}): Promise<{ success: boolean; supportRequestId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate UUID format to prevent database errors
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointment_id)) {
      return {
        success: false,
        error: 'Invalid appointment ID format',
      };
    }

    // Get appointment details with booking information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_id
      `,
      )
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError);
      return {
        success: false,
        error: 'Appointment not found',
      };
    }

    // Get booking details with service information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        client_id,
        professional_profile_id,
        professional_profiles (
          user_id
        ),
        booking_services (
          services (
            id,
            name
          )
        )
      `,
      )
      .eq('id', appointment.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return {
        success: false,
        error: 'Booking not found for this appointment',
      };
    }

    const clientId = booking.client_id;

    // Access the professional's user_id
    const professionalId = booking.professional_profiles?.user_id;

    // Verify the user is the client
    if (user.id !== clientId) {
      return {
        success: false,
        error: 'You can only create support requests for your own appointments',
      };
    }

    if (!professionalId) {
      return {
        success: false,
        error: 'Professional not found for this appointment',
      };
    }

    // Create a conversation for this support request
    const conversationPurpose = `support_request_${appointment_id}`;

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        professional_id: professionalId,
        purpose: conversationPurpose,
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return {
        success: false,
        error: 'Failed to create conversation for support request',
      };
    }

    // Extract service name for the title - handle potential type issues with safe access
    let serviceName = '';
    try {
      const firstBookingService = booking.booking_services?.[0];
      const services = firstBookingService?.services;
      // Handle both array and object cases for services
      if (Array.isArray(services)) {
        serviceName = services[0]?.name || '';
      } else if (services && typeof services === 'object') {
        serviceName = (services as { name?: string }).name || '';
      }
    } catch {
      serviceName = '';
    }
    const title = serviceName ? serviceName : 'Appointment Support Request';

    // Create the support request
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .insert({
        client_id: clientId,
        professional_id: professionalId,
        conversation_id: conversation.id,
        title: title,
        description: reason,
        category: 'booking_issue', // Default category
        priority: 'medium', // Default priority
        status: 'pending',
        appointment_id: appointment_id,
        booking_id: booking.id,
      })
      .select()
      .single();

    if (supportRequestError) {
      console.error('Error creating support request:', supportRequestError);
      return {
        success: false,
        error: 'Failed to create support request',
      };
    }

    // Add initial message to the conversation
    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: clientId,
      content: `Support request opened: ${reason}`,
    });

    if (messageError) {
      console.error('Error creating initial message:', messageError);
      // We don't return an error here as the support request was created successfully
    }

    // Send creation email to professional
    await sendSupportRequestCreationEmail(supportRequest.id, professionalId);

    return {
      success: true,
      supportRequestId: supportRequest.id,
    };
  } catch (error) {
    console.error('Error in createSupportRequest:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Create support request and redirect to the created request page
 */
export async function createSupportRequestWithRedirect(formData: FormData) {
  const appointment_id = formData.get('appointment_id') as string;
  const reason = formData.get('reason') as string;

  if (!appointment_id || !reason?.trim()) {
    return { success: false, error: 'Missing required fields' };
  }

  const result = await createSupportRequestAction({
    appointment_id,
    reason: reason.trim(),
  });

  if (result.success && result.supportRequestId) {
    redirect(`/support-request/${result.supportRequestId}`);
  }

  return result;
}

/**
 * Initiate a refund for a support request - Server Action
 */
export async function initiateRefundServerAction(formData: FormData) {
  try {
    const support_request_id = formData.get('support_request_id') as string;
    const refund_amount = parseFloat(formData.get('refund_amount') as string);
    const professional_notes = formData.get('professional_notes') as
      | string
      | undefined;

    if (!support_request_id || isNaN(refund_amount)) {
      return {
        success: false,
        error: 'Invalid input parameters',
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(support_request_id)) {
      return {
        success: false,
        error: 'Invalid support request ID format',
      };
    }

    // Get support request
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', support_request_id)
      .eq('professional_id', user.id)
      .single();

    if (supportRequestError || !supportRequest) {
      console.error('Error fetching support request:', supportRequestError);
      return {
        success: false,
        error: 'Support request not found or you do not have permission',
      };
    }

    // =================================================================
    // PRE-REFUND VALIDATION: Check database consistency
    // =================================================================
    console.log('[SERVER-ACTION] Validating support request state...');

    // 1. Check if support request is in correct state for refund
    if (
      supportRequest.status === 'resolved' ||
      supportRequest.status === 'closed'
    ) {
      console.error(
        `[SERVER-ACTION] Support request already ${supportRequest.status}`,
      );
      return {
        success: false,
        error: `This support request has already been ${supportRequest.status}`,
      };
    }

    // 2. Check if already processed (has refund amount or refund ID)
    if (supportRequest.refund_amount && supportRequest.refund_amount > 0) {
      console.error(
        `[SERVER-ACTION] Refund already processed: $${supportRequest.refund_amount}`,
      );
      return {
        success: false,
        error: `A refund of $${supportRequest.refund_amount.toFixed(2)} has already been processed for this request`,
      };
    }

    if (supportRequest.stripe_refund_id) {
      console.error(
        `[SERVER-ACTION] Stripe refund already exists: ${supportRequest.stripe_refund_id}`,
      );
      return {
        success: false,
        error: 'A refund has already been processed in Stripe for this request',
      };
    }

    // 3. Get and validate booking payment status
    const adminSupabase = createAdminClient();

    // Try to find booking payment from support request relationships
    if (supportRequest.booking_id) {
      const { data: bookingPayment } = await adminSupabase
        .from('booking_payments')
        .select('id, status, refunded_amount, refund_transaction_id')
        .eq('booking_id', supportRequest.booking_id)
        .single();

      if (bookingPayment) {
        // Check if booking payment already refunded
        if (
          bookingPayment.status === 'refunded' ||
          bookingPayment.status === 'partially_refunded'
        ) {
          console.error(
            `[SERVER-ACTION] Booking payment already ${bookingPayment.status}`,
          );
          return {
            success: false,
            error: `Payment has already been ${bookingPayment.status}. Refund amount: $${bookingPayment.refunded_amount || 0}`,
          };
        }

        // Check for orphaned refund transaction ID (empty string or exists)
        if (
          bookingPayment.refund_transaction_id &&
          bookingPayment.refund_transaction_id.trim() !== ''
        ) {
          console.error(
            `[SERVER-ACTION] Refund transaction already exists: ${bookingPayment.refund_transaction_id}`,
          );
          return {
            success: false,
            error:
              'A refund transaction already exists for this booking payment',
          };
        }
      }
    }

    console.log('[SERVER-ACTION] ✅ Pre-refund validation passed');
    console.log(
      `[SERVER-ACTION] Processing refund through Stripe for $${refund_amount}`,
    );

    // Process the refund through Stripe
    const {
      success,
      refundId,
      error: refundError,
    } = await processStripeRefund(support_request_id, refund_amount);

    if (!success) {
      console.error('[SERVER-ACTION] Refund processing failed:', refundError);
      return {
        success: false,
        error: refundError || 'Failed to process refund',
      };
    }

    // =================================================================
    // POST-REFUND VALIDATION: Verify refund was actually created
    // =================================================================
    console.log('[SERVER-ACTION] Validating refund result...');

    // Verify we received a refund ID (if success=true but no refundId, that's suspicious)
    if (!refundId) {
      console.log(
        '[SERVER-ACTION] ⚠️ WARNING: Refund succeeded but no refundId returned',
      );
      console.log(
        '[SERVER-ACTION] This may indicate payment was canceled rather than refunded',
      );
      // Don't fail here - cancellations are valid for uncaptured payments
    } else {
      console.log(
        `[SERVER-ACTION] ✅ Refund created successfully: ${refundId}`,
      );
    }

    // Double-check the database was actually updated
    const { data: updatedSupport } = await supabase
      .from('support_requests')
      .select('stripe_refund_id, refund_amount')
      .eq('id', support_request_id)
      .single();

    if (!updatedSupport?.stripe_refund_id && !updatedSupport?.refund_amount) {
      console.error(
        '[SERVER-ACTION] ⚠️⚠️⚠️ CRITICAL: processStripeRefund returned success but database not updated!',
      );
      console.error(
        `[SERVER-ACTION] Manual intervention required for support request: ${support_request_id}`,
      );
      return {
        success: false,
        error:
          'Refund may have been processed but database update failed. Please contact support.',
      };
    }

    console.log('[SERVER-ACTION] ✅ Database successfully updated');
    console.log('[SERVER-ACTION] ✅ Post-refund validation passed');

    console.log(
      '[SERVER-ACTION] Refund processed successfully, sending message and updating status',
    );

    // Add a message to the conversation BEFORE resolving the support request
    if (supportRequest.conversation_id) {
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: `Refund of $${refund_amount.toFixed(2)} has been initiated. ${
          professional_notes ? `Note: ${professional_notes}` : ''
        }`,
      });

      if (messageError) {
        console.error(
          '[SERVER-ACTION] Error creating refund message:',
          messageError,
        );
        // Don't return error as the refund was processed successfully
      }
    }

    // Now update support request status to resolved and add professional notes
    const updateData: {
      status: 'resolved';
      resolved_at: string;
      resolved_by: string;
      resolution_notes: string;
      professional_notes?: string;
    } = {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution_notes: 'Resolved via successful Stripe refund',
    };

    if (professional_notes) {
      updateData.professional_notes = professional_notes;
    }

    const { error: updateError } = await adminSupabase
      .from('support_requests')
      .update(updateData)
      .eq('id', support_request_id);

    if (updateError) {
      console.error(
        '[SERVER-ACTION] Error updating support request status:',
        updateError,
      );
      // Don't fail the entire operation for status update failure
    }

    // Send refund emails to both client and professional
    await sendSupportRequestRefundedEmails(support_request_id, refund_amount);

    console.log('[SERVER-ACTION] Refund initiation completed successfully');
    return {
      success: true,
    };
  } catch (error) {
    console.error(
      '[SERVER-ACTION] Error in initiateRefundServerAction:',
      error,
    );
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Resolve a support request - Server Action
 */
export async function resolveSupportRequestAction({
  support_request_id,
  resolution_notes,
}: {
  support_request_id: string;
  resolution_notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(support_request_id)) {
      return {
        success: false,
        error: 'Invalid support request ID format',
      };
    }

    // Get support request to check if user is the professional (using regular client for authorization)
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', support_request_id)
      .eq('professional_id', user.id)
      .single();

    if (supportRequestError || !supportRequest) {
      console.error('Error fetching support request:', supportRequestError);
      return {
        success: false,
        error: 'Support request not found or you do not have permission',
      };
    }

    // Update the support request using admin client (bypasses RLS)
    const { error: updateError } = await adminSupabase
      .from('support_requests')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: resolution_notes || null,
      })
      .eq('id', support_request_id);

    if (updateError) {
      console.error('Error resolving support request:', updateError);
      return {
        success: false,
        error: 'Failed to resolve support request',
      };
    }

    // Add a message to the conversation
    if (supportRequest.conversation_id) {
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: `Support request has been resolved. ${
          resolution_notes ? `Resolution notes: ${resolution_notes}` : ''
        }`,
      });

      if (messageError) {
        console.error('Error creating resolution message:', messageError);
        // Don't return error as the support request was resolved successfully
      }
    }

    // Send resolved emails
    await sendSupportRequestResolvedEmails(support_request_id);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in resolveSupportRequest:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Send support request creation email to professional
 */
async function sendSupportRequestCreationEmail(
  supportRequestId: string,
  professionalUserId: string,
) {
  try {
    // Use admin client for auth operations
    const adminSupabase = createAdminClient();

    // Get professional data using admin client
    const { data: professionalAuth, error: professionalAuthError } =
      await adminSupabase.auth.admin.getUserById(professionalUserId);
    if (professionalAuthError || !professionalAuth.user?.email) {
      console.error('Failed to get professional email:', professionalAuthError);
      return;
    }

    const { data: professionalUser, error: professionalUserError } =
      await adminSupabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', professionalUserId)
        .single();

    if (professionalUserError || !professionalUser) {
      console.error(
        'Failed to get professional user data:',
        professionalUserError,
      );
      return;
    }

    await sendSupportRequestCreation(
      [
        {
          email: professionalAuth.user.email,
          name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        },
      ],
      {
        professional_name: `${professionalUser.first_name} ${professionalUser.last_name}`,
        support_request_url: `${process.env.NEXT_PUBLIC_BASE_URL}/support-request/${supportRequestId}`,
      },
    );

    console.log('✅ Support request creation email sent to professional');
  } catch (error) {
    console.error('❌ Error sending support request creation email:', error);
  }
}

/**
 * Send support request resolved emails to both client and professional
 */
async function sendSupportRequestResolvedEmails(supportRequestId: string) {
  try {
    // Use admin client for auth operations
    const adminSupabase = createAdminClient();

    // Get support request data with booking and user info
    const { data: supportRequest, error: supportRequestError } =
      await adminSupabase
        .from('support_requests')
        .select(
          `
        id,
        booking_id,
        client_id,
        professional_id,
        bookings (
          id,
          clients:users!client_id (
            first_name,
            last_name
          ),
          professional_profiles (
            users (
              first_name,
              last_name
            )
          )
        )
      `,
        )
        .eq('id', supportRequestId)
        .single();

    if (supportRequestError || !supportRequest) {
      console.error('Failed to get support request data:', supportRequestError);
      return;
    }

    const booking = supportRequest.bookings;
    if (!booking) {
      console.error('Missing booking data');
      return;
    }

    const client = booking.clients;
    const professional = booking.professional_profiles?.users;

    if (!client || !professional) {
      console.error('Missing client or professional data');
      return;
    }

    if (!supportRequest.client_id || !supportRequest.professional_id) {
      console.error('Missing client or professional ID');
      return;
    }

    // Get email addresses using admin client
    const { data: clientAuth, error: clientAuthError } =
      await adminSupabase.auth.admin.getUserById(supportRequest.client_id);
    const { data: professionalAuth, error: professionalAuthError } =
      await adminSupabase.auth.admin.getUserById(
        supportRequest.professional_id,
      );

    if (
      clientAuthError ||
      !clientAuth.user?.email ||
      professionalAuthError ||
      !professionalAuth.user?.email
    ) {
      console.error('Failed to get email addresses');
      return;
    }

    const clientName = `${client.first_name} ${client.last_name}`;
    const professionalName = `${professional.first_name} ${professional.last_name}`;

    // Send emails
    await Promise.all([
      sendSupportRequestResolvedClient(
        [{ email: clientAuth.user.email, name: clientName }],
        {
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          professional_name: professionalName,
        },
      ),
      sendSupportRequestResolvedProfessional(
        [{ email: professionalAuth.user.email, name: professionalName }],
        {
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          professional_name: professionalName,
        },
      ),
    ]);

    console.log('✅ Support request resolved emails sent');
  } catch (error) {
    console.error('❌ Error sending support request resolved emails:', error);
  }
}

/**
 * Send support request refunded emails to both client and professional
 */
async function sendSupportRequestRefundedEmails(
  supportRequestId: string,
  refundAmount: number,
) {
  try {
    // Use admin client for auth operations
    const adminSupabase = createAdminClient();

    // Get support request data with booking, appointment, and user info
    const { data: supportRequest, error: supportRequestError } =
      await adminSupabase
        .from('support_requests')
        .select(
          `
        id,
        booking_id,
        appointment_id,
        client_id,
        professional_id,
        bookings (
          id,
          clients:users!client_id (
            first_name,
            last_name
          ),
          professional_profiles (
            users (
              first_name,
              last_name
            )
          ),
          booking_services (
            services (
              name
            )
          )
        ),
        appointments (
          start_time
        )
      `,
        )
        .eq('id', supportRequestId)
        .single();

    if (supportRequestError || !supportRequest) {
      console.error('Failed to get support request data:', supportRequestError);
      return;
    }

    const booking = supportRequest.bookings;
    const appointment = supportRequest.appointments;

    if (!booking || !appointment) {
      console.error('Missing booking or appointment data');
      return;
    }

    const client = booking.clients;
    const professional = booking.professional_profiles?.users;

    if (!client || !professional) {
      console.error('Missing client or professional data');
      return;
    }

    if (!supportRequest.client_id || !supportRequest.professional_id) {
      console.error('Missing client or professional ID');
      return;
    }

    // Get email addresses using admin client
    const { data: clientAuth, error: clientAuthError } =
      await adminSupabase.auth.admin.getUserById(supportRequest.client_id);
    const { data: professionalAuth, error: professionalAuthError } =
      await adminSupabase.auth.admin.getUserById(
        supportRequest.professional_id,
      );

    if (
      clientAuthError ||
      !clientAuth.user?.email ||
      professionalAuthError ||
      !professionalAuth.user?.email
    ) {
      console.error('Failed to get email addresses');
      return;
    }

    const clientName = `${client.first_name} ${client.last_name}`;
    const professionalName = `${professional.first_name} ${professional.last_name}`;

    // Extract services from booking
    const services =
      booking.booking_services?.map((bs) => ({
        name:
          typeof bs.services === 'object' && bs.services !== null
            ? (bs.services as { name?: string }).name || 'Service'
            : 'Service',
      })) || [];

    // Format date and time for email
    const appointmentDate = new Date(appointment.start_time);
    const formattedDateTime = appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Get payment method for client email
    const { data: payment } = await adminSupabase
      .from('booking_payments')
      .select(
        `
        payment_methods (
          name
        )
      `,
      )
      .eq('booking_id', supportRequest.booking_id || '')
      .single();

    const refundMethod =
      payment?.payment_methods?.name || 'original payment method';

    // Send emails
    await Promise.all([
      sendSupportRequestRefundedClient(
        [{ email: clientAuth.user.email, name: clientName }],
        {
          services,
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          date_and_time: formattedDateTime,
          professional_name: professionalName,
          refund_amount: refundAmount,
          refund_method: refundMethod,
        },
      ),
      sendSupportRequestRefundedProfessional(
        [{ email: professionalAuth.user.email, name: professionalName }],
        {
          services,
          booking_id: supportRequest.booking_id || '',
          client_name: clientName,
          date_and_time: formattedDateTime,
          professional_name: professionalName,
          refund_amount: refundAmount,
        },
      ),
    ]);

    console.log('✅ Support request refunded emails sent');
  } catch (error) {
    console.error('❌ Error sending support request refunded emails:', error);
  }
}
