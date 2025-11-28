'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { processStripeRefund } from '../refunds/stripe-refund';
import { redirect } from 'next/navigation';
import {
  sendSupportRequestCreation,
  sendSupportRequestResolvedClient,
  sendSupportRequestResolvedProfessional,
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

    console.log('[SERVER-ACTION] Processing refund through Stripe');
    // Process the refund through Stripe
    const { success, error: refundError } = await processStripeRefund(
      support_request_id,
      refund_amount,
    );

    if (!success) {
      console.error('[SERVER-ACTION] Refund processing failed:', refundError);
      return {
        success: false,
        error: refundError || 'Failed to process refund',
      };
    }

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

    const { error: updateError } = await supabase
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

    // Get support request to check if user is the professional
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

    // Update the support request
    const { error: updateError } = await supabase
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
    const adminSupabase = await createAdminClient();

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
    const adminSupabase = await createAdminClient();

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
