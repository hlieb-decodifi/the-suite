// Export template functions
export { 
  createAdminNotificationEmail, 
  createUserConfirmationEmail,
  type EmailTemplate 
} from './templates';

// Export the email provider (currently Brevo, but can be swapped)
export { sendEmail } from './providers/brevo'; 