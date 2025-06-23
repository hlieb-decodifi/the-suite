import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import { createBookingConfirmationProfessionalEmail, createBookingConfirmationClientEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email';
import { 
  createPaymentConfirmationClientEmail,
  createPaymentConfirmationProfessionalEmail
} from '@/lib/email/templates';
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
      .select('date, start_time')
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

    // Get professional data with profile
    const { data: professionalData, error: professionalError } = await adminSupabase
      .from('professional_profiles')
      .select(`
        user_id,
        phone_number,
        location,
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

    console.log('📍 Address data: Not connected yet, treating as optional');

    // Format appointment date and time
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const appointmentTime = new Date(`1970-01-01T${appointment.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Prepare services data with proper formatting
    const servicesData = services.map((bs) => ({
      name: bs.services?.name || 'Service',
      description: bs.services?.description || '',
      duration: bs.duration,
      price: bs.price
    }));

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
      const professionalEmailData: Parameters<typeof createBookingConfirmationProfessionalEmail>[2] = {
        bookingId,
        appointmentId,
        appointmentDate,
        appointmentTime,
        clientName: `${clientData.first_name} ${clientData.last_name}`,
        services: servicesData,
        subtotal,
        tipAmount,
        professionalTotal,
        isUncaptured,
        ...(clientProfile?.phone_number && { clientPhone: clientProfile.phone_number }),
        ...(bookingData.notes && { notes: bookingData.notes })
      };

      const professionalEmail = createBookingConfirmationProfessionalEmail(
        professionalAuth.user.email,
        `${professional.first_name} ${professional.last_name}`,
        professionalEmailData
      );

      await sendEmail(professionalEmail);
      console.log('Professional confirmation email sent successfully');
      emailsSentSuccessfully++;
    } catch (error) {
      console.error('Failed to send professional confirmation email:', error);
      // Continue to try sending client email even if professional email fails
    }

    // Send client email
    try {
      const clientEmailData: Parameters<typeof createBookingConfirmationClientEmail>[2] = {
        bookingId,
        appointmentId,
        appointmentDate,
        appointmentTime,
        professionalName: `${professional.first_name} ${professional.last_name}`,
        services: servicesData,
        subtotal,
        serviceFee,
        tipAmount,
        totalPaid,
        isUncaptured,
        ...(professionalData.phone_number && { professionalPhone: professionalData.phone_number }),
        ...(professionalData.location && { professionalAddress: professionalData.location }),
        ...(bookingData.notes && { notes: bookingData.notes })
      };

      const clientEmail = createBookingConfirmationClientEmail(
        clientAuth.user.email,
        `${clientData.first_name} ${clientData.last_name}`,
        clientEmailData
      );

      await sendEmail(clientEmail);
      console.log('Client confirmation email sent successfully');
      emailsSentSuccessfully++;
    } catch (error) {
      console.error('Failed to send client confirmation email:', error);
    }

    // Mark emails as sent in memory to prevent duplicates in this session
    if (emailsSentSuccessfully > 0) {
      emailsSentTracker.add(bookingId);
      console.log('Marked confirmation emails as sent for booking:', bookingId);
    }

    return { success: true };

  } catch (error) {
    console.error('Error sending booking confirmation emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Send payment confirmation emails after payment capture
 */
export async function sendPaymentConfirmationEmails(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[EMAIL] Starting payment confirmation emails for booking: ${bookingId}`);

    // Get booking details for confirmation emails
    const bookingDetailsResult = await getBookingDetailsForConfirmation(bookingId);
    
    if (!bookingDetailsResult.success || !bookingDetailsResult.booking) {
      console.error(`[EMAIL] Failed to get booking details: ${bookingDetailsResult.error}`);
      return { 
        success: false, 
        error: bookingDetailsResult.error || 'Failed to get booking details' 
      };
    }

    const booking = bookingDetailsResult.booking;

    // Create client payment confirmation email
    const clientEmail = createPaymentConfirmationClientEmail(
      booking.clientEmail,
      booking.clientName,
      {
        bookingId,
        professionalName: booking.professionalName,
        appointmentDate: booking.appointmentDate,
        appointmentTime: booking.appointmentTime,
        serviceName: booking.serviceName,
        totalAmount: booking.totalAmount,
        tipAmount: booking.tipAmount,
        capturedAmount: booking.capturedAmount
      }
    );

    // Create professional payment notification email
    const professionalEmail = createPaymentConfirmationProfessionalEmail(
      booking.professionalEmail,
      booking.professionalName,
      {
        bookingId,
        clientName: booking.clientName,
        appointmentDate: booking.appointmentDate,
        appointmentTime: booking.appointmentTime,
        serviceName: booking.serviceName,
        totalAmount: booking.totalAmount,
        tipAmount: booking.tipAmount,
        capturedAmount: booking.capturedAmount
      }
    );

    // Send emails using the existing sendEmail function
    const [clientEmailResult, professionalEmailResult] = await Promise.allSettled([
      sendEmail(clientEmail),
      sendEmail(professionalEmail)
    ]);

    // Check results
    const errors: string[] = [];
    
    if (clientEmailResult.status === 'rejected') {
      console.error(`[EMAIL] Failed to send client payment confirmation:`, clientEmailResult.reason);
      errors.push(`Client email failed: ${clientEmailResult.reason}`);
    } else {
      console.log(`[EMAIL] ✅ Client payment confirmation sent to: ${booking.clientEmail}`);
    }

    if (professionalEmailResult.status === 'rejected') {
      console.error(`[EMAIL] Failed to send professional payment notification:`, professionalEmailResult.reason);
      errors.push(`Professional email failed: ${professionalEmailResult.reason}`);
    } else {
      console.log(`[EMAIL] ✅ Professional payment notification sent to: ${booking.professionalEmail}`);
    }

    if (errors.length > 0) {
      return { 
        success: false, 
        error: `Some emails failed: ${errors.join(', ')}` 
      };
    }

    console.log(`[EMAIL] ✅ All payment confirmation emails sent successfully for booking: ${bookingId}`);
    return { success: true };

  } catch (error) {
    console.error(`[EMAIL] Error sending payment confirmation emails for booking ${bookingId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 