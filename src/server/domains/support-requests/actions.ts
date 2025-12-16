import { createClient, createAdminClient } from '@/lib/supabase/server';
export { getAdminSupportRequestMessages } from './admin-actions';
/**
 * Get a single support request with all details (admin version)
 */
export async function getAdminSupportRequest(id: string): Promise<{
  success: boolean;
  supportRequest?: SupportRequestData;
  error?: string;
}> {
  try {
    // Use regular client to check user and role
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
    // Check admin role
    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });
    if (!isAdmin) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return {
        success: false,
        error: 'Invalid support request ID format',
      };
    }
    // Use admin client to fetch support request with all related data
    const adminSupabase = createAdminClient();
    const { data: supportRequest, error } = await adminSupabase
      .from('support_requests')
      .select(
        `
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
              service_fee,
              deposit_amount,
              status,
              stripe_payment_intent_id,
              refunded_amount,
              refund_reason,
              refunded_at,
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
      `,
      )
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching support request (admin):', error);
      return {
        success: false,
        error: 'Support request not found',
      };
    }
    return {
      success: true,
      supportRequest,
    };
  } catch (error) {
    console.error('Error in getAdminSupportRequest:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Create a new support request
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

    // Get appointment details with service information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        bookings (
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
        )
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

    const booking = appointment.bookings;
    const clientId = booking.client_id;
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
 * Get all support requests for the current user
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

    // Check if user is a client or professional
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: user.id,
    });

    // Get support requests based on user role
    const query = supabase
      .from('support_requests')
      .select(
        `
        *,
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
                name
              )
            )
          )
        ),
        conversations(
          id
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (isProfessional) {
      query.eq('professional_id', user.id);
    } else {
      query.eq('client_id', user.id);
    }

    const { data: supportRequests, error } = await query;

    if (error) {
      console.error('Error fetching support requests:', error);
      return {
        success: false,
        error: 'Failed to fetch support requests',
      };
    }

    // For each support request, get the count of unread messages
    const supportRequestsWithUnreadCount = await Promise.all(
      supportRequests.map(async (request) => {
        if (request.conversation_id) {
          const { data: unreadCount } = await supabase.rpc(
            'get_unread_message_count',
            {
              p_conversation_id: request.conversation_id,
              p_user_id: user.id,
            },
          );

          return {
            ...request,
            unreadCount: unreadCount || 0,
            conversationId: request.conversation_id,
          };
        }
        return { ...request, unreadCount: 0 };
      }),
    );

    return {
      success: true,
      supportRequests: supportRequestsWithUnreadCount,
    };
  } catch (error) {
    console.error('Error in getSupportRequests:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get a single support request with all details
 */
// Define a simplified type for support request data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupportRequestData = Record<string, any>;

export async function getSupportRequest(id: string): Promise<{
  success: boolean;
  supportRequest?: SupportRequestData;
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
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return {
        success: false,
        error: 'Invalid support request ID format',
      };
    }

    // Get support request with all related data
    const { data: supportRequest, error } = await supabase
      .from('support_requests')
      .select(
        `
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
              service_fee,
              deposit_amount,
              status,
              stripe_payment_intent_id,
              refunded_amount,
              refund_reason,
              refunded_at,
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
      `,
      )
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
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Close a support request (without resolving)
 */
export async function closeSupportRequest({
  support_request_id,
}: {
  support_request_id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

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
        status: 'closed',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', support_request_id);

    if (updateError) {
      console.error('Error closing support request:', updateError);
      return {
        success: false,
        error: 'Failed to close support request',
      };
    }

    // Add a message to the conversation
    if (supportRequest.conversation_id) {
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: supportRequest.conversation_id,
        sender_id: user.id,
        content: 'Support request has been closed without resolution.',
      });

      if (messageError) {
        console.error('Error creating closure message:', messageError);
        // Don't return error as the support request was closed successfully
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in closeSupportRequest:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
