import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { 
  sendBookingConfirmationClient,
  sendBookingConfirmationProfessional,
  sendPaymentConfirmationClient,
  sendPaymentConfirmationProfessional
} from '@/providers/brevo/templates';
import { getBookingDetailsForConfirmation } from './db';

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
        addresses (
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
          client_phone: clientProfile?.phone_number || undefined,
          professional_name: `${professional.first_name} ${professional.last_name}`,
          subtotal,
          tip_amount: tipAmount,
          professional_total: professionalTotal,
          booking_id: bookingId,
          appointment_id: appointmentId,
          date: appointmentDate,
          time: appointmentTime,
          appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointmentId}`,
          website_url: process.env.NEXT_PUBLIC_BASE_URL!,
          support_email: process.env.BREVO_ADMIN_EMAIL!
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

    // Send client email
    try {
      const result = await sendBookingConfirmationClient(
        [{ email: clientAuth.user.email, name: `${clientData.first_name} ${clientData.last_name}` }],
        {
          client_name: `${clientData.first_name} ${clientData.last_name}`,
          professional_name: `${professional.first_name} ${professional.last_name}`,
          subtotal,
          tip_amount: tipAmount,
          total: totalPaid,
          payment_method: 'Credit Card',
          deposit_amount: isUncaptured ? totalPaid : 0,
          balance_due: isUncaptured ? subtotal + serviceFee - totalPaid : 0,
          balance_due_date: isUncaptured ? new Date(appointment.start_time).toISOString() : '',
          booking_id: bookingId,
          appointment_id: appointmentId,
          date: appointmentDate,
          time: appointmentTime,
          appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointmentId}`,
          website_url: process.env.NEXT_PUBLIC_BASE_URL!,
          support_email: process.env.BREVO_ADMIN_EMAIL!
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

/**
 * Send payment confirmation emails to both client and professional
 */
export async function sendPaymentConfirmationEmails(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking details
    const { booking, error: bookingError } = await getBookingDetailsForConfirmation(bookingId);

    if (bookingError || !booking) {
      console.error('Failed to fetch booking data for payment confirmation:', bookingError);
      return { success: false, error: 'Failed to fetch booking data' };
    }

    const {
      clientEmail,
      clientName,
      professionalEmail,
      professionalName,
      appointmentDate,
      appointmentTime,
      totalAmount: subtotal,
      tipAmount,
      capturedAmount: totalPaid,
    } = booking;

    const professionalTotal = subtotal + (tipAmount || 0);
    let emailsSentSuccessfully = 0;

    // Send client email
    try {
      const result = await sendPaymentConfirmationClient(
        [{ email: clientEmail, name: clientName }],
        {
          client_name: clientName,
          professional_name: professionalName,
          payment_method: 'Credit Card',
          subtotal,
          tip_amount: tipAmount || 0,
          total: totalPaid,
          booking_id: bookingId,
          appointment_id: bookingId,
          date: appointmentDate,
          time: appointmentTime,
          appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${bookingId}`,
          website_url: process.env.NEXT_PUBLIC_BASE_URL!,
          support_email: process.env.BREVO_ADMIN_EMAIL!
        }
      );

      if (result.success) {
        emailsSentSuccessfully++;
        console.log('✅ Client payment confirmation email sent:', result.messageId);
      } else {
        console.error('❌ Failed to send client payment confirmation email:', result.error);
      }
    } catch (error) {
      console.error('❌ Error sending client payment confirmation email:', error);
    }

    // Send professional email
    try {
      const result = await sendPaymentConfirmationProfessional(
        [{ email: professionalEmail, name: professionalName }],
        {
          client_name: clientName,
          professional_name: professionalName,
          payment_method: 'Credit Card',
          subtotal,
          tip_amount: tipAmount || 0,
          professional_total: professionalTotal,
          booking_id: bookingId,
          appointment_id: bookingId,
          date: appointmentDate,
          time: appointmentTime,
          appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${bookingId}`,
          website_url: process.env.NEXT_PUBLIC_BASE_URL!,
          support_email: process.env.BREVO_ADMIN_EMAIL!
        }
      );

      if (result.success) {
        emailsSentSuccessfully++;
        console.log('✅ Professional payment confirmation email sent:', result.messageId);
      } else {
        console.error('❌ Failed to send professional payment confirmation email:', result.error);
      }
    } catch (error) {
      console.error('❌ Error sending professional payment confirmation email:', error);
    }

    return { success: emailsSentSuccessfully > 0 };

  } catch (error) {
    console.error('❌ Error in sendPaymentConfirmationEmails:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 