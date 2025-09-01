import { NextResponse } from 'next/server';
import { getAppointmentsNeedingBalanceNotification, markBalanceNotificationSent } from '@/server/domains/stripe-payments/db';
import { sendAppointmentCompletion2hafterClient, sendAppointmentCompletion2hafterProfessional} from '@/providers/brevo/templates';
import { EmailRecipient } from '@/providers/brevo/types';

export const runtime = 'nodejs';

/**
 * Cron job to send balance notifications to clients
 * Runs every 2 hours to check for completed appointments needing balance notifications
 */
export async function GET() {
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    console.log('[CRON] Starting balance notifications processing...');

    // Get appointments that need balance notifications
    const appointmentsNeedingNotification = await getAppointmentsNeedingBalanceNotification(100);
    
    console.log(`[CRON] Found ${appointmentsNeedingNotification.length} appointments needing balance notification`);

    if (appointmentsNeedingNotification.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No appointments need balance notifications',
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime
      });
    }

    // Process each appointment
    for (const appointment of appointmentsNeedingNotification) {
      try {
        console.log(`[CRON] Sending balance notification for booking: ${appointment.booking_id}`);

        // Format appointment date and time for the email
        const appointmentDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Calculate payment amounts (already in dollars from DB)
        const totalAmount = appointment.total_amount;
  // const depositPaid = appointment.deposit_amount; // removed unused variable
  // const balanceAmount = appointment.balance_amount; // removed unused variable
  // const currentTip = appointment.tip_amount || 0; // removed unused variable
  // const totalDue = balanceAmount + currentTip; // removed unused variable

        // Create recipient object
        const recipient: EmailRecipient = {
          email: appointment.client_email,
          name: appointment.client_name
        };

        // Send appointment completion emails to both client and professional
        const appointmentCompletionClientParams = {
          address: appointment.professional_address || '',
          booking_id: appointment.booking_id,
          client_name: appointment.client_name,
          date_time: `${appointmentDate} ${appointmentTime}`,
          professional_name: appointment.professional_name,
          service_amount: totalAmount,
          timezone: appointment.professional_timezone || '',
          total_paid: totalAmount,
          appointment_id: appointment.booking_id,
          appointment_details_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${appointment.booking_id}`,
          date: appointmentDate,
          time: appointmentTime,
          website_url: process.env.NEXT_PUBLIC_APP_URL || '',
          support_email: process.env.SUPPORT_EMAIL || ''
        };

        const appointmentCompletionProfessionalParams = {
          address: appointment.professional_address || '',
          booking_id: appointment.booking_id,
          client_name: appointment.client_name,
          date_time: `${appointmentDate} ${appointmentTime}`,
          payment_method: appointment.payment_method_name || '',
          professional_name: appointment.professional_name,
          service_amount: totalAmount,
          timezone: appointment.professional_timezone || '',
          total_amount: totalAmount,
          appointment_id: appointment.booking_id,
          appointment_details_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${appointment.booking_id}`,
          date: appointmentDate,
          time: appointmentTime,
          website_url: process.env.NEXT_PUBLIC_APP_URL || '',
          support_email: process.env.SUPPORT_EMAIL || ''
        };

        await Promise.all([
          sendAppointmentCompletion2hafterClient([recipient], appointmentCompletionClientParams),
          sendAppointmentCompletion2hafterProfessional([
            {
              email: appointment.professional_email,
              name: appointment.professional_name
            }
          ], appointmentCompletionProfessionalParams)
        ]);

        console.log(`[CRON] Successfully sent appointment completion emails for booking: ${appointment.booking_id}`);

        // Mark notification as sent in database
        await markBalanceNotificationSent(appointment.booking_id);

        processedCount++;

      } catch (error) {
        errorCount++;
        const errorMessage = `Booking ${appointment.booking_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(`[CRON] Error sending balance notification for booking ${appointment.booking_id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`[CRON] Balance notifications processing completed. Processed: ${processedCount}, Errors: ${errorCount}, Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Balance notifications processing completed`,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      duration
    });

  } catch (error) {
    console.error('[CRON] Fatal error in balance notifications processing:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Fatal error in balance notifications processing',
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: processedCount,
      errors: errorCount + 1,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
} 