import * as Brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import { initEmailSender, getEmailMethod, getTemplateContent } from './config';
import { 
  EmailRecipient,
  EmailResult,
  BookingCancellationParams,
  BookingConfirmationParams,
  PaymentConfirmationParams
} from './types';
import { TEMPLATE_IDS } from './constants';

async function sendTemplateEmail<T extends Record<string, unknown>>(
  templateId: number,
  to: EmailRecipient[],
  params: T
): Promise<EmailResult> {
  try {
    const method = getEmailMethod();
    const sender = initEmailSender();

    if (method === 'local') {
      // For local development, use nodemailer
      const transporter = sender as nodemailer.Transporter;
      
      // Try to get the actual template content
      const templateContent = await getTemplateContent(templateId, params);
      
      // Prepare email content - either from template or fallback
      const emailContent = templateContent || {
        subject: `Test Email - Template ${templateId}`,
        html: `<h1>Test Email - Template ${templateId}</h1>
               <pre>${JSON.stringify(params, null, 2)}</pre>`
      };

      const info = await transporter.sendMail({
        from: 'test@example.com',
        to: to.map(r => r.email).join(', '),
        subject: emailContent.subject,
        html: emailContent.html,
        // Include plain text version for better email client compatibility
        text: emailContent.html.replace(/<[^>]*>/g, '')
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } else {
      // For production, use Brevo API
      const apiInstance = sender as Brevo.TransactionalEmailsApi;
      const sendSmtpEmail = new Brevo.SendSmtpEmail();

      sendSmtpEmail.templateId = templateId;
      sendSmtpEmail.to = to;
      sendSmtpEmail.params = params;

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      return {
        success: true,
        messageId: `${templateId}-${Date.now()}`
      };
    }
  } catch (error) {
    console.error('Error sending template email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendBookingCancellation(
  to: EmailRecipient[],
  params: BookingCancellationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CANCELLATION, to, params);
}

export async function sendBookingConfirmation(
  to: EmailRecipient[],
  params: BookingConfirmationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CONFIRMATION, to, params);
}

export async function sendPaymentConfirmation(
  to: EmailRecipient[],
  params: PaymentConfirmationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.PAYMENT_CONFIRMATION, to, params);
} 