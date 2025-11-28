import * as Brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import { initEmailSender, getEmailMethod, getTemplateContent } from './config';
import {
  EmailRecipient,
  EmailResult,
  BookingCancellationWithinAcceptedTimePeriodProfessionalParams,
  BookingCancellationWithinAcceptedTimePeriodClientParams,
  BookingConfirmationClientParams,
  BookingConfirmationProfessionalParams,
  AppointmentCompletion2hafterClientParams,
  AppointmentCompletion2hafterProfessionalParams,
  BalanceNotificationParams,
  ContactInquiryAdminParams,
  ContactInquiryConfirmationParams,
  BookingCancellationLessthan24h48hclientParams,
  BookingCancellationLessthan24h48hprofessionalParams,
  BookingCancellationNoShowClientParams,
  BookingCancellationNoShowProfessionalParams,
  SupportRequestCreationParams,
  SupportRequestRefundedClientParams,
  SupportRequestRefundedProfessionalParams,
  SupportRequestResolvedClientParams,
  SupportRequestResolvedProfessionalParams,
} from './types';
import { EMAIL_TEMPLATE_TAGS } from './constants';
import { createClient } from '@/lib/supabase/client';

// Function to get Brevo template ID by tag from the database
async function getBrevoTemplateId(tag: string): Promise<number> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('brevo_template_id')
      .eq('tag', tag)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`Error fetching template with tag ${tag}:`, error);
      throw new Error(`Failed to fetch template: ${tag}`);
    }

    if (!data) {
      throw new Error(`Template not found: ${tag}`);
    }

    return data.brevo_template_id;
  } catch (error) {
    console.error(`Error getting Brevo template ID for tag ${tag}:`, error);
    throw error;
  }
}

// Generic function to send a template email using tag instead of ID
async function sendTemplateEmail<T extends Record<string, unknown>>(
  templateTag: string,
  to: EmailRecipient[],
  params: T,
): Promise<EmailResult> {
  try {
    const method = getEmailMethod();
    const sender = initEmailSender();

    // Get the actual Brevo template ID from the database
    const templateId = await getBrevoTemplateId(templateTag);

    if (method === 'local') {
      // For local development, use nodemailer
      const transporter = sender as nodemailer.Transporter;

      // Try to get the actual template content
      const templateContent = await getTemplateContent(templateId, params);

      // Prepare email content - either from template or fallback
      const emailContent = templateContent || {
        subject: `Test Email - ${templateTag}`,
        html: `<h1>Test Email - ${templateTag}</h1><pre>${JSON.stringify(params, null, 2)}</pre>`,
      };

      const info = await transporter.sendMail({
        from: 'test@example.com',
        to: to.map((r) => r.email).join(', '),
        subject: emailContent.subject,
        html: emailContent.html,
        // Include plain text version for better email client compatibility
        text: emailContent.html.replace(/<[^>]*>/g, ''),
      });
      return {
        success: true,
        messageId: info.messageId,
      };
    } else {
      // For production, use Brevo API
      const apiInstance = sender as Brevo.TransactionalEmailsApi;
      const sendSmtpEmail = new Brevo.SendSmtpEmail();

      sendSmtpEmail.templateId = templateId;
      sendSmtpEmail.to = to;
      sendSmtpEmail.params = params;
      sendSmtpEmail.sender = {
        email: process.env.BREVO_SENDER_EMAIL || 'support@the-suite.com',
        name: 'The Suite Team',
      };

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      return {
        success: true,
        messageId: `${templateTag}-${Date.now()}`,
      };
    }
  } catch (error) {
    console.error('Error sending template email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Booking Related

export async function sendBookingCancellationWithinAcceptedTimePeriodProfessional(
  to: EmailRecipient[],
  params: BookingCancellationWithinAcceptedTimePeriodProfessionalParams,
): Promise<EmailResult> {
  console.log('CANCELLATION WITHIN ACCEPTED TIME PERIOD PROFESSIONAL', {
    to,
    params,
  });
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_WITHIN_ACCEPTED_TIME_PERIOD_PROFESSIONAL,
    to,
    params,
  );
}

export async function sendBookingCancellationWithinAcceptedTimePeriodClient(
  to: EmailRecipient[],
  params: BookingCancellationWithinAcceptedTimePeriodClientParams,
): Promise<EmailResult> {
  console.log('CANCELLATION WITHIN ACCEPTED TIME PERIOD CLIENT', {
    to,
    params,
  });
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_WITHIN_ACCEPTED_TIME_PERIOD_CLIENT,
    to,
    params,
  );
}

export async function sendBookingConfirmationClient(
  to: EmailRecipient[],
  params: BookingConfirmationClientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CONFIRMATION_CLIENT,
    to,
    params,
  );
}

export async function sendBookingConfirmationProfessional(
  to: EmailRecipient[],
  params: BookingConfirmationProfessionalParams,
): Promise<EmailResult> {
  console.log('BOOKING CONFIRMATION PROFESSIONAL', { to, params });
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CONFIRMATION_PROFESSIONAL,
    to,
    params,
  );
}

export async function sendAppointmentCompletion2hafterClient(
  to: EmailRecipient[],
  params: AppointmentCompletion2hafterClientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.APPOINTMENT_COMPLETION_2H_AFTER_CLIENT,
    to,
    params,
  );
}

export async function sendAppointmentCompletion2hafterProfessional(
  to: EmailRecipient[],
  params: AppointmentCompletion2hafterProfessionalParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.APPOINTMENT_COMPLETION_2H_AFTER_PROFESSIONAL,
    to,
    params,
  );
}

// Payment Related

export async function sendBalanceNotification(
  to: EmailRecipient[],
  params: BalanceNotificationParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BALANCE_NOTIFICATION,
    to,
    params,
  );
}

// Contact Related
export async function sendContactInquiryAdmin(
  to: EmailRecipient[],
  params: ContactInquiryAdminParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.CONTACT_INQUIRY_ADMIN,
    to,
    params,
  );
}

export async function sendContactInquiryConfirmation(
  to: EmailRecipient[],
  params: ContactInquiryConfirmationParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.CONTACT_INQUIRY_CONFIRMATION,
    to,
    params,
  );
}

// Policy Related
export async function sendBookingCancellationLessthan24h48hclient(
  to: EmailRecipient[],
  params: BookingCancellationLessthan24h48hclientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_LESS_THAN_24H_48H_CLIENT,
    to,
    params,
  );
}

export async function sendBookingCancellationLessthan24h48hprofessional(
  to: EmailRecipient[],
  params: BookingCancellationLessthan24h48hprofessionalParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_LESS_THAN_24H_48H_PROFESSIONAL,
    to,
    params,
  );
}

// Incident Related
export async function sendBookingCancellationNoShowClient(
  to: EmailRecipient[],
  params: BookingCancellationNoShowClientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.NO_SHOW_NOTIFICATION_CLIENT,
    to,
    params,
  );
}

export async function sendBookingCancellationNoShowProfessional(
  to: EmailRecipient[],
  params: BookingCancellationNoShowProfessionalParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.NO_SHOW_NOTIFICATION_PROFESSIONAL,
    to,
    params,
  );
}

// Support Request Related
export async function sendSupportRequestCreation(
  to: EmailRecipient[],
  params: SupportRequestCreationParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_CREATION,
    to,
    params,
  );
}

export async function sendSupportRequestRefundedClient(
  to: EmailRecipient[],
  params: SupportRequestRefundedClientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_REFUNDED_CLIENT,
    to,
    params,
  );
}

export async function sendSupportRequestRefundedProfessional(
  to: EmailRecipient[],
  params: SupportRequestRefundedProfessionalParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_REFUNDED_PROFESSIONAL,
    to,
    params,
  );
}

export async function sendSupportRequestResolvedClient(
  to: EmailRecipient[],
  params: SupportRequestResolvedClientParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_RESOLVED_CLIENT,
    to,
    params,
  );
}

export async function sendSupportRequestResolvedProfessional(
  to: EmailRecipient[],
  params: SupportRequestResolvedProfessionalParams,
): Promise<EmailResult> {
  return sendTemplateEmail(
    EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_RESOLVED_PROFESSIONAL,
    to,
    params,
  );
}
