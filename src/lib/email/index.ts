// Export template functions
export { 
  sendContactInquiryAdmin,
  sendContactInquiryConfirmation,
  sendBalanceNotification,
  sendBookingConfirmationProfessional,
  sendBookingConfirmationClient,
  type EmailRecipient,
  type EmailResult,
  sendAdminInvitationEmail
} from '@/providers/brevo';

// Export the email provider (currently Brevo)
export { initEmailSender as sendEmail } from '@/providers/brevo'; 