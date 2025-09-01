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
  params: T
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
        html: `<h1>Test Email - ${templateTag}</h1><pre>${JSON.stringify(params, null, 2)}</pre>`
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
        messageId: `${templateTag}-${Date.now()}`
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
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_CLIENT, to, params);
}

export async function sendBookingCancellationProfessional(
  to: EmailRecipient[],
  params: BookingCancellationProfessionalParams
): Promise<EmailResult> {
  console.log('CANCELLATION PROFESSIONAL', {to, params});
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.BOOKING_CANCELLATION_PROFESSIONAL, to, params);
}

export async function sendBookingConfirmationClient(
  to: EmailRecipient[],
  params: BookingConfirmationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.BOOKING_CONFIRMATION_CLIENT, to, params);
}

export async function sendBookingConfirmationProfessional(
  to: EmailRecipient[],
  params: BookingConfirmationProfessionalParams
): Promise<EmailResult> {
  console.log('BOOKING CONFIRMATION PROFESSIONAL', {to, params});
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.BOOKING_CONFIRMATION_PROFESSIONAL, to, params);
}

// Payment Related
export async function sendPaymentConfirmationClient(
  to: EmailRecipient[],
  params: PaymentConfirmationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.PAYMENT_CONFIRMATION_CLIENT, to, params);
}

export async function sendPaymentConfirmationProfessional(
  to: EmailRecipient[],
  params: PaymentConfirmationProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.PAYMENT_CONFIRMATION_PROFESSIONAL, to, params);
}

export async function sendBalanceNotification(
  to: EmailRecipient[],
  params: BalanceNotificationParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.BALANCE_NOTIFICATION, to, params);
}

// Refund Related
export async function sendRefundRequestProfessional(
  to: EmailRecipient[],
  params: RefundRequestProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.REFUND_REQUEST_PROFESSIONAL, to, params);
}

export async function sendRefundCompletionClient(
  to: EmailRecipient[],
  params: RefundCompletionClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.REFUND_COMPLETION_CLIENT, to, params);
}

export async function sendRefundCompletionProfessional(
  to: EmailRecipient[],
  params: RefundCompletionProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.REFUND_COMPLETION_PROFESSIONAL, to, params);
}

export async function sendRefundDeclineClient(
  to: EmailRecipient[],
  params: RefundDeclineClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.REFUND_DECLINE_CLIENT, to, params);
}

// Review Related
export async function sendReviewTipNotification(
  to: EmailRecipient[],
  params: ReviewTipNotificationParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.REVIEW_TIP_NOTIFICATION, to, params);
}

// Contact Related
export async function sendContactInquiryAdmin(
  to: EmailRecipient[],
  params: ContactInquiryAdminParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.CONTACT_INQUIRY_ADMIN, to, params);
}

export async function sendContactInquiryConfirmation(
  to: EmailRecipient[],
  params: ContactInquiryConfirmationParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.CONTACT_INQUIRY_CONFIRMATION, to, params);
}

// Policy Related
export async function sendCancellationPolicyChargeClient(
  to: EmailRecipient[],
  params: CancellationPolicyChargeClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.CANCELLATION_POLICY_CHARGE_CLIENT, to, params);
}

export async function sendCancellationPolicyChargeProfessional(
  to: EmailRecipient[],
  params: CancellationPolicyChargeProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.CANCELLATION_POLICY_CHARGE_PROFESSIONAL, to, params);
}

// Incident Related
export async function sendNoShowNotificationClient(
  to: EmailRecipient[],
  params: NoShowNotificationClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.NO_SHOW_NOTIFICATION_CLIENT, to, params);
}

export async function sendNoShowNotificationProfessional(
  to: EmailRecipient[],
  params: NoShowNotificationProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.NO_SHOW_NOTIFICATION_PROFESSIONAL, to, params);
}

// Support Request Related
export async function sendSupportRequestCreation(
  to: EmailRecipient[],
  params: SupportRequestCreationParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_CREATION, to, params);
}

export async function sendSupportRequestRefundedClient(
  to: EmailRecipient[],
  params: SupportRequestRefundedClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_REFUNDED_CLIENT, to, params);
}

export async function sendSupportRequestRefundedProfessional(
  to: EmailRecipient[],
  params: SupportRequestRefundedProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_REFUNDED_PROFESSIONAL, to, params);
}

export async function sendSupportRequestResolvedClient(
  to: EmailRecipient[],
  params: SupportRequestResolvedClientParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_RESOLVED_CLIENT, to, params);
}

export async function sendSupportRequestResolvedProfessional(
  to: EmailRecipient[],
  params: SupportRequestResolvedProfessionalParams
): Promise<EmailResult> {
  return sendTemplateEmail(EMAIL_TEMPLATE_TAGS.SUPPORT_REQUEST_RESOLVED_PROFESSIONAL, to, params);
}