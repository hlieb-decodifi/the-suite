import * as Brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import { initEmailSender, getEmailMethod, getTemplateContent } from './config';
import { 
  EmailRecipient,
  EmailResult,
  BookingCancellationClientParams,
  BookingCancellationProfessionalParams,
  BookingConfirmationClientParams,
  BookingConfirmationProfessionalParams,
  PaymentConfirmationClientParams,
  PaymentConfirmationProfessionalParams,
  BalanceNotificationParams,
  RefundRequestProfessionalParams,
  RefundCompletionClientParams,
  RefundCompletionProfessionalParams,
  RefundDeclineClientParams,
  ReviewTipNotificationParams,
  ContactInquiryAdminParams,
  ContactInquiryConfirmationParams,
  CancellationPolicyChargeClientParams,
  CancellationPolicyChargeProfessionalParams,
  NoShowNotificationClientParams,
  NoShowNotificationProfessionalParams,
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
      sendSmtpEmail.sender = { 
        email: process.env.BREVO_SENDER_EMAIL || 'support@the-suite.com',
        name: 'The Suite Team'
      };

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

// Booking Related
export async function sendBookingCancellationClient(
  to: EmailRecipient[],
  params: BookingCancellationClientParams
): Promise<EmailResult> {
  console.log('CANCELLATION CLIENT', {to, params});
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CANCELLATION_CLIENT, to, params);
}

export async function sendBookingCancellationProfessional(
  to: EmailRecipient[],
  params: BookingCancellationProfessionalParams
): Promise<EmailResult> {
  console.log('CANCELLATION PROFESSIONAL', {to, params});
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CANCELLATION_PROFESSIONAL, to, params);
}

export async function sendBookingConfirmationClient(
  to: EmailRecipient[],
  params: BookingConfirmationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CONFIRMATION_CLIENT, to, params);
}

export async function sendBookingConfirmationProfessional(
  to: EmailRecipient[],
  params: BookingConfirmationProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.BOOKING_CONFIRMATION_PROFESSIONAL, to, params);
}

// Payment Related
export async function sendPaymentConfirmationClient(
  to: EmailRecipient[],
  params: PaymentConfirmationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.PAYMENT_CONFIRMATION_CLIENT, to, params);
}

export async function sendPaymentConfirmationProfessional(
  to: EmailRecipient[],
  params: PaymentConfirmationProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.PAYMENT_CONFIRMATION_PROFESSIONAL, to, params);
}

export async function sendBalanceNotification(
  to: EmailRecipient[],
  params: BalanceNotificationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.BALANCE_NOTIFICATION, to, params);
}

// Refund Related
export async function sendRefundRequestProfessional(
  to: EmailRecipient[],
  params: RefundRequestProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.REFUND_REQUEST_PROFESSIONAL, to, params);
}

export async function sendRefundCompletionClient(
  to: EmailRecipient[],
  params: RefundCompletionClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.REFUND_COMPLETION_CLIENT, to, params);
}

export async function sendRefundCompletionProfessional(
  to: EmailRecipient[],
  params: RefundCompletionProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.REFUND_COMPLETION_PROFESSIONAL, to, params);
}

export async function sendRefundDeclineClient(
  to: EmailRecipient[],
  params: RefundDeclineClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.REFUND_DECLINE_CLIENT, to, params);
}

// Review Related
export async function sendReviewTipNotification(
  to: EmailRecipient[],
  params: ReviewTipNotificationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.REVIEW_TIP_NOTIFICATION, to, params);
}

// Contact Related
export async function sendContactInquiryAdmin(
  to: EmailRecipient[],
  params: ContactInquiryAdminParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.CONTACT_INQUIRY_ADMIN, to, params);
}

export async function sendContactInquiryConfirmation(
  to: EmailRecipient[],
  params: ContactInquiryConfirmationParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.CONTACT_INQUIRY_CONFIRMATION, to, params);
}

// Policy Related
export async function sendCancellationPolicyChargeClient(
  to: EmailRecipient[],
  params: CancellationPolicyChargeClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.CANCELLATION_POLICY_CHARGE_CLIENT, to, params);
}

export async function sendCancellationPolicyChargeProfessional(
  to: EmailRecipient[],
  params: CancellationPolicyChargeProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.CANCELLATION_POLICY_CHARGE_PROFESSIONAL, to, params);
}

// Incident Related
export async function sendNoShowNotificationClient(
  to: EmailRecipient[],
  params: NoShowNotificationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.NO_SHOW_NOTIFICATION_CLIENT, to, params);
}

export async function sendNoShowNotificationProfessional(
  to: EmailRecipient[],
  params: NoShowNotificationProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(TEMPLATE_IDS.NO_SHOW_NOTIFICATION_PROFESSIONAL, to, params);
}