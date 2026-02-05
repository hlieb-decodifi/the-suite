import { NextRequest, NextResponse } from 'next/server';
import {
  getAppointmentsNeedingBalanceNotification,
  markBalanceNotificationSent,
} from '@/server/domains/stripe-payments/db';
import {
  sendAppointmentCompletion2hafterClient,
  sendAppointmentCompletion2hafterProfessional,
} from '@/providers/brevo/templates';
import { EmailRecipient } from '@/providers/brevo/types';
import { format, toZonedTime } from 'date-fns-tz';
import { chainToStaging } from '@/lib/utils/cron-chain';

export const runtime = 'nodejs';

/**
 * Format a UTC date/time for a specific timezone
 */
function formatDateTimeInTimezone(
  utcDateTime: string,
  timezone: string,
): string {
  try {
    const utcDate = new Date(utcDateTime);
    const zonedDate = toZonedTime(utcDate, timezone);
    return format(zonedDate, "EEEE, MMMM d, yyyy 'at' h:mm a zzz", {
      timeZone: timezone,
    });
  } catch (error) {
    console.error('Error formatting date in timezone:', error, {
      utcDateTime,
      timezone,
    });
    // Fallback to UTC formatting
    return (
      new Date(utcDateTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      }) + ' UTC'
    );
  }
}

/**
 * Cron job to send balance notifications to clients
 * Runs every 2 hours to check for completed appointments needing balance notifications
 */
export async function GET(request: NextRequest) {
  // Authenticate request - only allow execution from Vercel cron
  const authHeader = request.headers.get('authorization');
  console.log('🔐 Auth header present:', !!authHeader);

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized request - invalid auth header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('✅ Authentication successful');
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    console.log('[CRON] Starting balance notifications processing...');

    // Get appointments that need balance notifications
    const appointmentsNeedingNotification =
      await getAppointmentsNeedingBalanceNotification(100);

    console.log(
      `[CRON] Found ${appointmentsNeedingNotification.length} appointments needing balance notification`,
    );

    if (appointmentsNeedingNotification.length === 0) {
      // Chain to staging even when no work was done
      await chainToStaging({
        endpoint: '/api/cron/balance-notifications',
        awaitCompletion: false,
      });

      return NextResponse.json({
        success: true,
        message: 'No appointments need balance notifications',
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process each appointment
    for (const appointment of appointmentsNeedingNotification) {
      try {
        console.log(
          `[CRON] Sending balance notification for booking: ${appointment.booking_id}`,
        );

        // Format appointment date and time for the email using client and professional timezones
        const clientTimezone = appointment.client_timezone || 'UTC';
        const professionalTimezone = appointment.professional_timezone || 'UTC';

        const clientDateTime = formatDateTimeInTimezone(
          appointment.start_time,
          clientTimezone,
        );
        const professionalDateTime = formatDateTimeInTimezone(
          appointment.start_time,
          professionalTimezone,
        );

        // Calculate payment amounts (already in dollars from DB)
        const totalAmount = appointment.total_amount;
        const serviceAmount =
          totalAmount - appointment.tip_amount - appointment.service_fee;

        // Create recipient object
        const recipient: EmailRecipient = {
          email: appointment.client_email,
          name: appointment.client_name,
        };

        // Create review/tip URL for client - using appointment ID from the database
        const reviewTipUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${appointment.appointment_id}?showReviewPrompt=true`;

        // Send appointment completion emails to both client and professional
        const appointmentCompletionClientParams = {
          booking_id: appointment.booking_id,
          client_name: appointment.client_name,
          date_time: clientDateTime,
          professional_name: appointment.professional_name,
          review_tip_url: reviewTipUrl,
          service_amount: serviceAmount,
          timezone: clientTimezone,
          total_paid: totalAmount,
          services: appointment.services || [],
        };

        const appointmentCompletionProfessionalParams = {
          booking_id: appointment.booking_id,
          client_name: appointment.client_name,
          date_time: professionalDateTime,
          payment_method: appointment.payment_method_name || '',
          professional_name: appointment.professional_name,
          service_amount: serviceAmount,
          timezone: professionalTimezone,
          total_amount: serviceAmount + appointment.tip_amount, // Professional gets services + tips (no service fee)
          services: appointment.services || [],
        };

        await Promise.all([
          sendAppointmentCompletion2hafterClient(
            [recipient],
            appointmentCompletionClientParams,
          ),
          sendAppointmentCompletion2hafterProfessional(
            [
              {
                email: appointment.professional_email,
                name: appointment.professional_name,
              },
            ],
            appointmentCompletionProfessionalParams,
          ),
        ]);

        console.log(
          `[CRON] Successfully sent appointment completion emails for booking: ${appointment.booking_id}`,
        );

        // Mark notification as sent in database
        await markBalanceNotificationSent(appointment.booking_id);

        processedCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = `Booking ${appointment.booking_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(
          `[CRON] Error sending balance notification for booking ${appointment.booking_id}:`,
          error,
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[CRON] Balance notifications processing completed. Processed: ${processedCount}, Errors: ${errorCount}, Duration: ${duration}ms`,
    );

    // Chain to staging environment (fire and forget)
    await chainToStaging({
      endpoint: '/api/cron/balance-notifications',
      awaitCompletion: false,
    });

    return NextResponse.json({
      success: true,
      message: `Balance notifications processing completed`,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      duration,
    });
  } catch (error) {
    console.error(
      '[CRON] Fatal error in balance notifications processing:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Fatal error in balance notifications processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: processedCount,
        errors: errorCount + 1,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
