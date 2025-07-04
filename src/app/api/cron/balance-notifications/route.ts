import { NextResponse } from 'next/server';
import { getAppointmentsNeedingBalanceNotification, markBalanceNotificationSent } from '@/server/domains/stripe-payments/db';
import { createBalanceNotificationEmail, sendEmail } from '@/lib/email';

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
        const depositPaid = appointment.deposit_amount;
        const balanceAmount = appointment.balance_amount;
        const currentTip = appointment.tip_amount || 0;
        const totalDue = balanceAmount + currentTip;

        if (appointment.is_cash_payment) {
          // For cash payments: send review + tip notification (no balance due)
          const { createReviewTipNotificationEmail } = await import('@/lib/email/templates');
          const email = createReviewTipNotificationEmail(
            appointment.client_email,
            appointment.client_name,
            {
              bookingId: appointment.booking_id,
              professionalName: appointment.professional_name,
              appointmentDate,
              appointmentTime,
              paymentMethod: appointment.payment_method_name,
              totalAmount,
              serviceFee: appointment.service_fee
            }
          );

          // Send the email using Brevo
          await sendEmail(email);
          
          console.log(`[CRON] Successfully sent review/tip notification for cash payment booking: ${appointment.booking_id}`);
        } else {
          // For card payments: send balance notification
          const email = createBalanceNotificationEmail(
            appointment.client_email,
            appointment.client_name,
            {
              bookingId: appointment.booking_id,
              professionalName: appointment.professional_name,
              appointmentDate,
              appointmentTime,
              totalAmount,
              ...(depositPaid && { depositPaid }),
              balanceAmount,
              ...(currentTip > 0 && { currentTip }),
              totalDue
            }
          );

          // Send the email using Brevo
          await sendEmail(email);
          
          console.log(`[CRON] Successfully sent balance notification for card payment booking: ${appointment.booking_id}`);
        }

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