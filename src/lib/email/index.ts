// Export template functions
export { 
  createAdminNotificationEmail, 
  createUserConfirmationEmail,
  createBalanceNotificationEmail,
  createBookingConfirmationProfessionalEmail,
  createBookingConfirmationClientEmail,
  type EmailTemplate 
} from './templates';

// Export the email provider (currently Brevo, but can be swapped)
export { sendEmail } from './providers/brevo'; 