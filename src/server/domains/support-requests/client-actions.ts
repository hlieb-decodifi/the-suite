import { createClient } from '@/lib/supabase/client';

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
    const supabase = createClient();

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

    // Access the first booking in the array
    const booking = appointment.bookings[0];
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found for this appointment',
      };
    }

    const clientId = booking.client_id;

    // Access the professional's user_id
    const professionalProfile = booking.professional_profiles?.[0];
    const professionalId = professionalProfile?.user_id;

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
    const supabase = createClient();

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
