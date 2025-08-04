'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Create a support request from a client
 */
export async function createSupportRequest({
  appointment_id,
  reason,
}: {
  appointment_id: string;
  reason: string;
}): Promise<{ success: boolean; supportRequestId?: string; error?: string }> {
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

    // Get appointment details to verify ownership
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        bookings!inner(
          id,
          client_id,
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
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      console.error('Appointment error:', appointmentError);
      return {
        success: false,
        error: 'Appointment not found',
      };
    }

    const booking = appointment.bookings;
    const professionalId = booking.professional_profiles.user_id;

    // Verify the user is the client for this appointment
    if (booking.client_id !== user.id) {
      return {
        success: false,
        error: 'You can only create support requests for your own appointments',
      };
    }

    // Always create a new conversation specifically for this support request with unique purpose
    // This isolates support request messages from general client-professional chat
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        client_id: user.id,
        professional_id: professionalId,
        purpose: `support_request_${appointment_id}`, // Using appointment_id to ensure uniqueness
      })
      .select('id')
      .single();

    if (conversationError || !conversation) {
      console.error('Conversation creation error:', conversationError);
      return {
        success: false,
        error: 'Failed to create conversation for support request',
      };
    }
    const conversationId = conversation.id;

    // Get service name for title
    const serviceName = booking.booking_services.map((bs: { services: { name: string } }) => bs.services.name).join(', ');

    // Add an initial message to provide context about the support request
    const initialMessage = `Support Request: ${reason}`;
    
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: initialMessage,
      });

    // Create support request record
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .insert({
        appointment_id: appointment_id,
        booking_id: booking.id,
        client_id: user.id,
        professional_id: professionalId,
        conversation_id: conversationId,
        category: 'other', // Generic category, not refund-specific
        title: serviceName,
        description: reason,
        status: 'pending',
        priority: 'medium',
        // No refund-specific fields initially
      })
      .select('id')
      .single();

    if (supportRequestError) {
      console.error('Support request creation error:', supportRequestError);
      return {
        success: false,
        error: 'Failed to create support request',
      };
    }

    // TODO: Send email notification to professional
    // This can be implemented later similar to refund email notifications

    return {
      success: true,
      supportRequestId: supportRequest.id,
    };
  } catch (error) {
    console.error('Error creating support request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initiate a refund for an existing support request (Professional only)
 */
export async function initiateRefund({
  support_request_id,
  refund_amount,
  professional_notes,
}: {
  support_request_id: string;
  refund_amount: number;
  professional_notes?: string;
}): Promise<{ success: boolean; error?: string }> {
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

    // Check if user is professional
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });

    if (!isProfessional) {
      return {
        success: false,
        error: 'Only professionals can initiate refunds',
      };
    }

    // Get support request details
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select(`
        *,
        appointments(
          id,
          bookings(
            id,
            booking_payments(
              id,
              amount,
              tip_amount,
              status
            )
          )
        )
      `)
      .eq('id', support_request_id)
      .eq('professional_id', user.id) // Ensure professional owns this request
      .single();

    if (supportRequestError || !supportRequest) {
      return {
        success: false,
        error: 'Support request not found or you do not have permission',
      };
    }

    const appointment = supportRequest.appointments;
    if (!appointment) {
      return {
        success: false,
        error: 'Appointment not found',
      };
    }

    const booking = appointment.bookings;
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    const payment = booking.booking_payments;
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    // Calculate original amount
    const originalAmount = payment.amount + payment.tip_amount;

    // Validate refund amount
    if (refund_amount > originalAmount) {
      return {
        success: false,
        error: 'Refund amount cannot exceed the original payment amount',
      };
    }

    if (refund_amount <= 0) {
      return {
        success: false,
        error: 'Refund amount must be greater than zero',
      };
    }

    // Update support request with refund details
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({
        category: 'refund_request',
        booking_payment_id: payment.id,
        original_amount: originalAmount,
        requested_amount: refund_amount,
        professional_notes: professional_notes || null,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', support_request_id);

    if (updateError) {
      console.error('Error updating support request:', updateError);
      return {
        success: false,
        error: 'Failed to initiate refund',
      };
    }

    // Add a message to the conversation indicating refund has been initiated
    const refundMessage = `Professional has initiated a refund:\n\nRefund Amount: $${refund_amount.toFixed(2)}\nOriginal Amount: $${originalAmount.toFixed(2)}${professional_notes ? `\n\nNotes: ${professional_notes}` : ''}`;
    
    await supabase
      .from('messages')
      .insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: refundMessage,
      });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error initiating refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get support requests for a user (client or professional)
 */
export async function getSupportRequests(): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supportRequests?: Array<Record<string, any>>;
  error?: string;
}> {
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

    // Get support requests where user is either client or professional
    const { data: supportRequests, error } = await supabase
      .from('support_requests')
      .select(`
        *,
        appointments(
          id,
          start_time,
          end_time,
          bookings(
            booking_services(
              services(name)
            )
          )
        ),
        client_user:users!client_id(
          first_name,
          last_name
        ),
        professional_user:users!professional_id(
          first_name,
          last_name
        ),
        conversations(
          id
        )
      `)
      .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching support requests:', error);
      return {
        success: false,
        error: 'Failed to fetch support requests',
      };
    }
    
    // Get unread message counts for each support request's conversation
    const enhancedSupportRequests = await Promise.all(
      (supportRequests || []).map(async (supportRequest) => {
        if (supportRequest.conversations?.id) {
          // Count unread messages where sender is not the current user
          const { count, error: messagesError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', supportRequest.conversations.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          if (messagesError) {
            console.error('Error counting unread messages:', messagesError);
            return { ...supportRequest, unread_count: 0 };
          }

          return { ...supportRequest, unread_count: count || 0 };
        }
        return { ...supportRequest, unread_count: 0 };
      })
    );

    return {
      success: true,
      supportRequests: enhancedSupportRequests,
    };
  } catch (error) {
    console.error('Error in getSupportRequests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single support request with all details
 */
export async function getSupportRequest(id: string): Promise<{
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supportRequest?: Record<string, any>;
  error?: string;
}> {
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return {
        success: false,
        error: 'Invalid support request ID format',
      };
    }

    // Get support request with all related data
    const { data: supportRequest, error } = await supabase
      .from('support_requests')
      .select(`
        *,
        appointments(
          id,
          start_time,
          end_time,
          status,
          bookings(
            id,
            booking_services(
              services(
                id,
                name,
                description,
                price,
                duration
              )
            ),
            booking_payments(
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
        client_user:users!client_id(
          id,
          first_name,
          last_name,
          profile_photos(url)
        ),
        professional_user:users!professional_id(
          id,
          first_name,
          last_name,
          profile_photos(url)
        ),
        conversations(
          id
        )
      `)
      .eq('id', id)
      .or(`client_id.eq.${user.id},professional_id.eq.${user.id}`)
      .single();

    if (error) {
      console.error('Error fetching support request:', error);
      return {
        success: false,
        error: 'Support request not found or access denied',
      };
    }

    return {
      success: true,
      supportRequest,
    };
  } catch (error) {
    console.error('Error in getSupportRequest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resolve a support request (Professional only)
 */
export async function resolveSupportRequest({
  support_request_id,
  resolution_notes,
}: {
  support_request_id: string;
  resolution_notes?: string;
}): Promise<{ success: boolean; error?: string }> {
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

    // First, get the support request to verify ownership and get conversation ID
    const { data: supportRequest, error: fetchError } = await supabase
      .from('support_requests')
      .select('id, professional_id, conversation_id, status')
      .eq('id', support_request_id)
      .single();

    if (fetchError || !supportRequest) {
      console.error('Error fetching support request:', fetchError);
      return {
        success: false,
        error: 'Support request not found',
      };
    }

    // Verify the user is the professional for this request
    if (supportRequest.professional_id !== user.id) {
      return {
        success: false,
        error: 'You do not have permission to resolve this support request',
      };
    }

    // Check if already resolved
    if (supportRequest.status === 'resolved') {
      return {
        success: false,
        error: 'Support request is already resolved',
      };
    }

    // Update support request status to resolved
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({
        status: 'resolved',
        resolution_notes: resolution_notes || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id, // Set the professional as the resolver
        updated_at: new Date().toISOString(),
      })
      .eq('id', support_request_id);

    if (updateError) {
      console.error('Error updating support request:', updateError);
      return {
        success: false,
        error: 'Failed to resolve support request',
      };
    }

    // Add a message to the conversation indicating resolution
    const resolutionMessage = `Support request has been resolved by the professional.${resolution_notes ? `\n\nResolution Notes: ${resolution_notes}` : ''}`;
    
    await supabase
      .from('messages')
      .insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: resolutionMessage,
      });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error resolving support request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close a support request (Professional only)
 */
export async function closeSupportRequest({
  support_request_id,
}: {
  support_request_id: string;
}): Promise<{ success: boolean; error?: string }> {
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

    // Check if user is professional
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });

    if (!isProfessional) {
      return {
        success: false,
        error: 'Only professionals can close support requests',
      };
    }

    // Get support request details
    const { data: supportRequest, error: supportRequestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', support_request_id)
      .eq('professional_id', user.id) // Ensure professional owns this request
      .single();

    if (supportRequestError || !supportRequest) {
      return {
        success: false,
        error: 'Support request not found or you do not have permission',
      };
    }

    // Update support request status to closed
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({
        status: 'closed',
        resolved_at: supportRequest.resolved_at || new Date().toISOString(), // Use existing or set new
        resolved_by: supportRequest.resolved_by || user.id, // Use existing or set new
        updated_at: new Date().toISOString(),
      })
      .eq('id', support_request_id);

    if (updateError) {
      console.error('Error closing support request:', updateError);
      return {
        success: false,
        error: 'Failed to close support request',
      };
    }

    // Add a message to the conversation indicating closure
    const closureMessage = 'Support request has been closed by the professional.';
    
    await supabase
      .from('messages')
      .insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: closureMessage,
      });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error closing support request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
