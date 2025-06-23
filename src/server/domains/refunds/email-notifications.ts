import { sendEmail } from '@/lib/email';
import {
  createRefundRequestNotificationEmail,
  createRefundDeclineNotificationEmail,
  createRefundCompletionClientEmail,
  createRefundCompletionProfessionalEmail
} from '@/lib/email/templates';

/**
 * Send refund request notification to professional
 */
export async function sendRefundRequestNotification(
  professionalEmail: string,
  professionalName: string,
  refundData: {
    refundId: string;
    clientName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    originalAmount: number;
    reason: string;
    reviewUrl: string;
  }
) {
  const email = createRefundRequestNotificationEmail(
    professionalEmail,
    professionalName,
    refundData
  );

  return sendEmail(email);
}

/**
 * Send refund decline notification to client
 */
export async function sendRefundDeclineNotification(
  clientEmail: string,
  clientName: string,
  data: {
    professionalName: string;
    serviceName: string;
    originalAmount: number;
    declinedReason?: string;
    professionalNotes?: string;
  }
) {
  const email = createRefundDeclineNotificationEmail(
    clientEmail,
    clientName,
    data
  );

  return sendEmail(email);
}

/**
 * Send refund completion notifications to both client and professional
 */
export async function sendRefundCompletionNotifications(
  clientEmail: string,
  clientName: string,
  professionalEmail: string,
  professionalName: string,
  data: {
    serviceName: string;
    originalAmount: number;
    refundAmount: number;
    transactionFee: number;
    professionalNotes?: string;
  }
) {
  // Send confirmation to client
  const clientEmail_ = createRefundCompletionClientEmail(
    clientEmail,
    clientName,
    {
      professionalName,
      serviceName: data.serviceName,
      originalAmount: data.originalAmount,
      refundAmount: data.refundAmount,
      ...(data.professionalNotes && { professionalNotes: data.professionalNotes })
    }
  );

  // Send notification to professional
  const professionalEmail_ = createRefundCompletionProfessionalEmail(
    professionalEmail,
    professionalName,
    {
      clientName,
      serviceName: data.serviceName,
      originalAmount: data.originalAmount,
      refundAmount: data.refundAmount,
      transactionFee: data.transactionFee
    }
  );

  // Send both emails
  await Promise.all([
    sendEmail(clientEmail_),
    sendEmail(professionalEmail_)
  ]);
} 