import fs from 'fs';
import path from 'path';
import { ContactFormData } from '@/components/forms/ContactForm/schema';

export type EmailTemplate = {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: { email: string; name?: string };
}

type TemplateData = {
  [key: string]: unknown;
}

const templatesDir = path.join(process.cwd(), 'src/lib/email/templates');

function loadTemplate(templateName: string, type: 'hbs' | 'txt'): string {
  const templatePath = path.join(templatesDir, `${templateName}.${type}`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  
  return fs.readFileSync(templatePath, 'utf-8');
}

function compileTemplate(templateContent: string, data: TemplateData): string {
  let result = templateContent;
  
  // Replace simple variables {{variable}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  // For phone number conditional
  const phoneMatch = result.match(/{{#if\s+phone}}([\s\S]*?){{\/if}}/);
  if (phoneMatch && phoneMatch[1]) {
    const phoneContent = data.phone ? phoneMatch[1] : '';
    result = result.replace(/{{#if\s+phone}}[\s\S]*?{{\/if}}/, phoneContent);
  }
  
  return result;
}

export function createAdminNotificationEmail(
  inquiryId: string,
  formData: ContactFormData
): EmailTemplate {
  const urgencyColors = {
    low: '#22c55e',
    medium: '#f59e0b', 
    high: '#ef4444'
  };

  const urgency = 'medium'; // Since we default to medium in the schema
  const urgencyColor = urgencyColors[urgency];

  const templateData: TemplateData = {
    inquiryId,
    urgency,
    urgencyColor,
    subject: formData.subject,
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    message: formData.message,
    submittedAt: new Date().toLocaleString(),
    dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/messages`
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('contact-inquiry-admin', 'hbs');
  const textTemplate = loadTemplate('contact-inquiry-admin', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: process.env.BREVO_ADMIN_EMAIL! }],
    subject: `New Contact Inquiry: ${formData.subject}`,
    htmlContent,
    textContent
  };
}

export function createUserConfirmationEmail(
  email: string,
  name: string,
  inquiryId: string
): EmailTemplate {
  const templateData: TemplateData = {
    name,
    inquiryId,
    adminEmail: process.env.BREVO_ADMIN_EMAIL!,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('contact-inquiry-confirmation', 'hbs');
  const textTemplate = loadTemplate('contact-inquiry-confirmation', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email, name }],
    subject: 'Thank you for contacting us - We\'ll be in touch soon!',
    htmlContent,
    textContent
  };
} 

export function createBalanceNotificationEmail(
  clientEmail: string,
  clientName: string,
  data: {
    bookingId: string;
    professionalName: string;
    appointmentDate: string;
    appointmentTime: string;
    totalAmount: number;
    depositPaid?: number;
    balanceAmount: number;
    currentTip?: number;
    totalDue: number;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName: data.professionalName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    totalAmount: data.totalAmount.toFixed(2),
    depositPaid: data.depositPaid?.toFixed(2),
    balanceAmount: data.balanceAmount.toFixed(2),
    currentTip: data.currentTip?.toFixed(2),
    totalDue: data.totalDue.toFixed(2),
    balancePaymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.bookingId}/balance`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!,
    bookingId: data.bookingId
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('balance-notification', 'hbs');
  const textTemplate = loadTemplate('balance-notification', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: `Your appointment balance is ready - ${data.professionalName}`,
    htmlContent,
    textContent
  };
} 