import {
  sendRefundRequestProfessional,
  sendRefundDeclineClient,
  sendRefundCompletionClient,
  sendRefundCompletionProfessional
} from '@/providers/brevo/templates';

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
  return sendRefundRequestProfessional(
    [{ email: professionalEmail, name: professionalName }],
    {
      professional_name: professionalName,
      client_name: refundData.clientName,
      service_name: refundData.serviceName,
      original_amount: refundData.originalAmount,
      reason: refundData.reason,
      review_url: refundData.reviewUrl,
      date: refundData.appointmentDate,
      time: refundData.appointmentTime,
      appointment_id: refundData.refundId,
      appointment_details_url: refundData.reviewUrl,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );
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
  return sendRefundDeclineClient(
    [{ email: clientEmail, name: clientName }],
    {
      client_name: clientName,
      professional_name: data.professionalName,
      original_amount: data.originalAmount,
      decline_reason: data.declinedReason || 'No reason provided',
      booking_id: 'N/A', // Required by type but not used in this context
      appointment_id: 'N/A', // Required by type but not used in this context
      date: new Date().toISOString(), // Required by type but not used in this context
      time: new Date().toLocaleTimeString(), // Required by type but not used in this context
      appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings`,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );
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
  const clientEmailPromise = sendRefundCompletionClient(
    [{ email: clientEmail, name: clientName }],
    {
      client_name: clientName,
      professional_name: professionalName,
      original_amount: data.originalAmount,
      refund_amount: data.refundAmount,
      reason: data.professionalNotes || 'Refund processed',
      booking_id: 'N/A', // Required by type but not used in this context
      appointment_id: 'N/A', // Required by type but not used in this context
      date: new Date().toISOString(), // Required by type but not used in this context
      time: new Date().toLocaleTimeString(), // Required by type but not used in this context
      appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings`,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );

  // Send notification to professional
  const professionalEmailPromise = sendRefundCompletionProfessional(
    [{ email: professionalEmail, name: professionalName }],
    {
      client_name: clientName,
      professional_name: professionalName,
      original_amount: data.originalAmount,
      refund_amount: data.refundAmount,
      platform_fee: data.transactionFee,
      net_refund: data.refundAmount - data.transactionFee,
      reason: data.professionalNotes || 'Refund processed',
      booking_id: 'N/A', // Required by type but not used in this context
      appointment_id: 'N/A', // Required by type but not used in this context
      date: new Date().toISOString(), // Required by type but not used in this context
      time: new Date().toLocaleTimeString(), // Required by type but not used in this context
      appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings`,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );

  // Send both emails
  await Promise.all([clientEmailPromise, professionalEmailPromise]);
} 