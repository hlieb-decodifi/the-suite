import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { 
  sendBookingConfirmationClient,
  sendBookingConfirmationProfessional,

} from '@/providers/brevo/templates';

// Create admin client for operations that need elevated permissions
function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Global set to track which bookings have had emails sent in this session
const emailsSentTracker = new Set<string>();

// Helper function to format address like in booking page
function formatAddress(address: {
  street_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
} | null): string {
  if (!address) return '';
  const parts = [
    address.street_address,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

// Helper function to generate message URL for email notifications
async function generateMessageURL(currentUserId: string, targetUserId: string): Promise<string> {
  try {
    const adminSupabase = createSupabaseAdminClient();
    
    // Determine who is client and who i`s professional
    const { data: isCurrentUserClient } = await adminSupabase.rpc('is_client', {
      user_uuid: currentUserId,
    });
    const { data: isCurrentUserProfessional } = await adminSupabase.rpc('is_professional', {
      user_uuid: currentUserId,
    });
    const { data: isTargetClient } = await adminSupabase.rpc('is_client', {
      user_uuid: targetUserId,
    });
    const { data: isTargetProfessional } = await adminSupabase.rpc('is_professional', {
      user_uuid: targetUserId,
    });

    let clientId: string;
    let professionalId: string;

    if (isCurrentUserClient && isTargetProfessional) {
      clientId = currentUserId;
      professionalId = targetUserId;
    } else if (isCurrentUserProfessional && isTargetClient) {
      clientId = targetUserId;
      professionalId = currentUserId;
    } else {
      // Fallback to general messages if roles can't be determined
      return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`;
    }

    // Check if conversation already exists
    const { data: existingConversation } = await adminSupabase
      .from('conversations')
      .select('id')
      .eq('client_id', clientId)
      .eq('professional_id', professionalId)
      .eq('purpose', 'general')
      .single();

    if (existingConversation) {
      return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages?conversation=${existingConversation.id}`;
    }

    // Get professional profile ID for booking check
    const { data: professionalProfile } = await adminSupabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', professionalId)
      .single();

    if (!professionalProfile) {
      return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`;
    }

    // Check if they have shared appointments (they should since this is a booking confirmation)
    const { data: sharedAppointments } = await adminSupabase
      .from('bookings')
      .select('id')
      .eq('client_id', clientId)
      .eq('professional_profile_id', professionalProfile.id)
      .limit(1);

    const hasSharedAppointments = sharedAppointments && sharedAppointments.length > 0;

    if (hasSharedAppointments) {
      // Create the conversation using admin client
      const { data: newConversation, error: createError } = await adminSupabase
        .from('conversations')
        .insert({
          client_id: clientId,
          professional_id: professionalId,
          purpose: 'general'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation for email:', createError);
        return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`;
      }

      return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages?conversation=${newConversation.id}`;
    }

    // Fallback to general messages page
    return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`;
  } catch (error) {
    console.error('Error generating message URL for email:', error);
    return `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`;
  }
}

/**
 * Send booking confirmation emails to both client and professional
 */
export async function sendBookingConfirmationEmails(
  bookingId: string,
  appointmentId: string,
  isUncaptured: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚀 sendBookingConfirmationEmails called with:', {
      bookingId,
      appointmentId,
      isUncaptured
    });

    // Check if emails have already been sent for this booking in this session
    if (emailsSentTracker.has(bookingId)) {
      console.log('⚠️ Confirmation emails already sent for booking in this session:', bookingId);
      return { success: true };
    }

    console.log('📊 Creating admin Supabase client...');
    const adminSupabase = createSupabaseAdminClient();

    // Get comprehensive booking data with all related information
    const { data: bookingData, error: bookingError } = await adminSupabase
      .from('bookings')
      .select(`
        id,
        client_id,
        professional_profile_id,
        notes,
        booking_services (
          price,
          duration,
          services (
            name,
            description
          )
        ),
        booking_payments (
          amount,
          tip_amount,
          service_fee
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !bookingData) {
      console.error('Failed to fetch booking data for emails:', bookingError);
      return { success: false, error: 'Failed to fetch booking data' };
    }

    // Get appointment data
    const { data: appointment, error: appointmentError } = await adminSupabase
      .from('appointments')
      .select('start_time')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('Failed to fetch appointment data:', appointmentError);
      return { success: false, error: 'Failed to fetch appointment data' };
    }

    // Get client data with profile for phone number
    const { data: clientData, error: clientError } = await adminSupabase
      .from('users')
      .select(`
        first_name, 
        last_name,
        client_profiles (
          phone_number
        )
      `)
      .eq('id', bookingData.client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Failed to fetch client data:', clientError);
      return { success: false, error: 'Failed to fetch client data' };
    }

    // Get professional data with profile and address
    const { data: professionalData, error: professionalError } = await adminSupabase
      .from('professional_profiles')
      .select(`
        user_id,
        phone_number,
        location,
        address:address_id(
          street_address,
          city,
          state,
          country
        ),
        users (
          first_name,
          last_name
        )
      `)
      .eq('id', bookingData.professional_profile_id)
      .single();

    if (professionalError || !professionalData) {
      console.error('Failed to fetch professional data:', professionalError);
      return { success: false, error: 'Failed to fetch professional data' };
    }

    // Get email addresses using admin client to bypass RLS
    // Get client email
    const { data: clientAuth, error: clientAuthError } = await adminSupabase.auth.admin.getUserById(bookingData.client_id);
    if (clientAuthError || !clientAuth.user?.email) {
      console.error('Failed to get client email:', clientAuthError);
      return { success: false, error: 'Failed to get client email' };
    }

    // Get professional email
    const { data: professionalAuth, error: professionalAuthError } = await adminSupabase.auth.admin.getUserById(professionalData.user_id);
    if (professionalAuthError || !professionalAuth.user?.email) {
      console.error('Failed to get professional email:', professionalAuthError);
      return { success: false, error: 'Failed to get professional email' };
    }

    // Extract necessary data
    const services = Array.isArray(bookingData.booking_services) ? bookingData.booking_services : [];
    const payment = Array.isArray(bookingData.booking_payments) ? bookingData.booking_payments[0] : bookingData.booking_payments;
    const professional = professionalData.users;
    const clientProfile = Array.isArray(clientData.client_profiles) ? clientData.client_profiles[0] : clientData.client_profiles;

    if (!services.length || !payment || !professional) {
      console.error('Missing required data for booking confirmation emails');
      return { success: false, error: 'Missing required booking data' };
    }

    // Format address for professional
    const professionalAddress = formatAddress(professionalData.address);

    // Prepare services array for email templates (import formatDuration if needed)
    const { formatDuration } = await import('@/utils/formatDuration');
    const servicesForEmail = services.map(service => ({
      name: service.services?.name || '',
      description: service.services?.description || '',
      duration: formatDuration(service.duration || 0),
      price: service.price || 0
    }));

    // Generate message URLs
    const clientMessageUrl = await generateMessageURL(bookingData.client_id, professionalData.user_id);
    const professionalMessageUrl = await generateMessageURL(professionalData.user_id, bookingData.client_id);

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

    // Calculate totals
    const subtotal = services.reduce((sum: number, bs) => sum + (bs.price || 0), 0);
    const serviceFee = payment.service_fee || 0;
    const tipAmount = payment.tip_amount || 0;
    const totalPaid = payment.amount || 0;
    const professionalTotal = subtotal + tipAmount; // Professional gets services + tip (no service fee)

    console.log('Sending booking confirmation emails...');
    console.log('Client:', `${clientData.first_name} ${clientData.last_name}`, clientAuth.user.email);
    console.log('Professional:', `${professional.first_name} ${professional.last_name}`, professionalAuth.user.email);

    let emailsSentSuccessfully = 0;

    // Send professional email
    try {
      const result = await sendBookingConfirmationProfessional(
        [{ email: professionalAuth.user.email, name: `${professional.first_name} ${professional.last_name}` }],
        {
          client_name: `${clientData.first_name} ${clientData.last_name}`,
          client_phone: clientProfile?.phone_number || '',
          professional_name: `${professional.first_name} ${professional.last_name}`,
          price_subtotal: subtotal,
          price_tip: tipAmount,
          price_total_paid: professionalTotal,
          booking_id: bookingId,
          appointment_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointmentId}`,
          date_and_time: `${appointmentDate} at ${appointmentTime}`,
          address: professionalAddress,
          home_url: process.env.NEXT_PUBLIC_BASE_URL!,
          message_url: professionalMessageUrl,
          services: servicesForEmail
        }
      );

      if (result.success) {
        emailsSentSuccessfully++;
        console.log('✅ Professional confirmation email sent:', result.messageId);
      } else {
        console.error('❌ Failed to send professional confirmation email:', result.error);
      }
    } catch (error) {
      console.error('❌ Error sending professional confirmation email:', error);
    }

    console.log('🚀 sendBookingConfirmationEmails called with:', {
      bookingId,
      appointmentId,
      isUncaptured
    });

    // TODO: Add payment details when needed for email templates
    // const { data: paymentData, error: paymentError } = await adminSupabase
    //   .from('booking_payments')
    //   .select(`
    //     *,
    //     payment_method:payment_methods(
    //       name,
    //       is_online
    //     )
    //   `)
    //   .eq('booking_id', bookingId)
    //   .single();

    // if (paymentError) {
    //   console.error('Error fetching payment details:', paymentError);
    //   throw new Error('Failed to fetch payment details');
    // }

    // Send client email
    try {
      const result = await sendBookingConfirmationClient(
        [{ email: clientAuth.user.email, name: `${clientData.first_name} ${clientData.last_name}` }],
        {
          client_name: `${clientData.first_name} ${clientData.last_name}`,
          professional_name: `${professional.first_name} ${professional.last_name}`,
          price_subtotal: subtotal,
          price_service_fee: serviceFee,
          price_tip: tipAmount,
          price_total_paid: totalPaid,
          booking_id: bookingId,
          appointment_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointmentId}`,
          date_and_time: `${appointmentDate} at ${appointmentTime}`,
          home_url: process.env.NEXT_PUBLIC_BASE_URL!,
          message_url: clientMessageUrl,
          professional_address: professionalAddress,
          professional_phone: professionalData.phone_number || '',
          services: servicesForEmail
        }
      );

      if (result.success) {
        emailsSentSuccessfully++;
        console.log('✅ Client confirmation email sent:', result.messageId);
      } else {
        console.error('❌ Failed to send client confirmation email:', result.error);
      }
    } catch (error) {
      console.error('❌ Error sending client confirmation email:', error);
    }

    // Add booking to sent tracker if both emails were sent successfully
    if (emailsSentSuccessfully === 2) {
      emailsSentTracker.add(bookingId);
    }

    return { success: emailsSentSuccessfully > 0 };

  } catch (error) {
    console.error('❌ Error in sendBookingConfirmationEmails:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Payment confirmation emails have been removed 