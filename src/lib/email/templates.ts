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
  
  // Handle {{#each}} loops
  const eachMatches = result.match(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g);
  if (eachMatches) {
    eachMatches.forEach(match => {
      const eachMatch = match.match(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/);
      if (eachMatch && eachMatch[1] && eachMatch[2]) {
        const arrayName = eachMatch[1];
        const loopTemplate = eachMatch[2];
        const arrayData = data[arrayName];
        
        if (Array.isArray(arrayData)) {
          const compiledItems = arrayData.map(item => {
            let itemTemplate = loopTemplate;
            // Replace variables in the loop template
            if (typeof item === 'object' && item !== null) {
              for (const [key, value] of Object.entries(item)) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                itemTemplate = itemTemplate.replace(regex, String(value || ''));
              }
            }
            return itemTemplate;
          }).join('');
          
          result = result.replace(match, compiledItems);
        } else {
          result = result.replace(match, '');
        }
      }
    });
  }
  
  // Handle {{#if}} conditionals
  const ifMatches = result.match(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g);
  if (ifMatches) {
    ifMatches.forEach(match => {
      const ifMatch = match.match(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/);
      if (ifMatch && ifMatch[1] && ifMatch[2]) {
        const conditionName = ifMatch[1];
        const conditionalContent = ifMatch[2];
        const conditionValue = data[conditionName];
        
        // Show content if condition is truthy and not empty
        const shouldShow = conditionValue && 
          (typeof conditionValue !== 'string' || conditionValue.trim() !== '') &&
          (typeof conditionValue !== 'number' || conditionValue !== 0);
          
        result = result.replace(match, shouldShow ? conditionalContent : '');
      }
    });
  }
  
  // Replace simple variables {{variable}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
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

export function createBookingConfirmationProfessionalEmail(
  professionalEmail: string,
  professionalName: string,
  data: {
    bookingId: string;
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    notes?: string;
    services: Array<{
      name: string;
      duration: number;
      price: number;
    }>;
    subtotal: number;
    tipAmount?: number;
    professionalTotal: number;
    isUncaptured: boolean;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    clientName: data.clientName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    bookingId: data.bookingId,
    clientPhone: data.clientPhone,
    clientAddress: data.clientAddress,
    notes: data.notes,
    services: data.services.map(service => ({
      ...service,
      price: service.price.toFixed(2)
    })),
    subtotal: data.subtotal.toFixed(2),
    tipAmount: data.tipAmount?.toFixed(2),
    professionalTotal: data.professionalTotal.toFixed(2),
    isUncaptured: data.isUncaptured,
    appointmentDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.appointmentId}`,
    dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('booking-confirmation-professional', 'hbs');
  const textTemplate = loadTemplate('booking-confirmation-professional', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: professionalEmail, name: professionalName }],
    subject: `New booking from ${data.clientName} - ${data.appointmentDate}`,
    htmlContent,
    textContent
  };
}

export function createBookingConfirmationClientEmail(
  clientEmail: string,
  clientName: string,
  data: {
    bookingId: string;
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    professionalName: string;
    professionalPhone?: string;
    professionalAddress?: string;
    notes?: string;
    services: Array<{
      name: string;
      duration: number;
      price: number;
    }>;
    subtotal: number;
    serviceFee: number;
    tipAmount?: number;
    totalPaid: number;
    isUncaptured: boolean;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName: data.professionalName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    bookingId: data.bookingId,
    professionalPhone: data.professionalPhone,
    professionalAddress: data.professionalAddress,
    notes: data.notes,
    services: data.services.map(service => ({
      ...service,
      price: service.price.toFixed(2)
    })),
    subtotal: data.subtotal.toFixed(2),
    serviceFee: data.serviceFee.toFixed(2),
    tipAmount: data.tipAmount?.toFixed(2),
    totalPaid: data.totalPaid.toFixed(2),
    isUncaptured: data.isUncaptured,
    appointmentDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.appointmentId}`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('booking-confirmation-client', 'hbs');
  const textTemplate = loadTemplate('booking-confirmation-client', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: `Booking confirmed with ${data.professionalName} - ${data.appointmentDate}`,
    htmlContent,
    textContent
  };
}

export function createPaymentConfirmationClientEmail(
  clientEmail: string,
  clientName: string,
  data: {
    bookingId: string;
    professionalName: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceName: string;
    totalAmount: number;
    tipAmount: number;
    capturedAmount: number;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    clientName,
    professionalName: data.professionalName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    serviceName: data.serviceName,
    totalAmount: data.totalAmount.toFixed(2),
    tipAmount: data.tipAmount.toFixed(2),
    capturedAmount: data.capturedAmount.toFixed(2),
    bookingId: data.bookingId,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('payment-confirmation-client', 'hbs');
  const textTemplate = loadTemplate('payment-confirmation-client', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: `Payment confirmed - ${data.professionalName}`,
    htmlContent,
    textContent
  };
}

export function createPaymentConfirmationProfessionalEmail(
  professionalEmail: string,
  professionalName: string,
  data: {
    bookingId: string;
    clientName: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceName: string;
    totalAmount: number;
    tipAmount: number;
    capturedAmount: number;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName,
    clientName: data.clientName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    serviceName: data.serviceName,
    totalAmount: data.totalAmount.toFixed(2),
    tipAmount: data.tipAmount.toFixed(2),
    capturedAmount: data.capturedAmount.toFixed(2),
    bookingId: data.bookingId,
    dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('payment-confirmation-professional', 'hbs');
  const textTemplate = loadTemplate('payment-confirmation-professional', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: professionalEmail, name: professionalName }],
    subject: `Payment received from ${data.clientName} - ${data.appointmentDate}`,
    htmlContent,
    textContent
  };
}

export function createReviewTipNotificationEmail(
  clientEmail: string,
  clientName: string,
  data: {
    bookingId: string;
    professionalName: string;
    appointmentDate: string;
    appointmentTime: string;
    paymentMethod: string;
    totalAmount: number;
    serviceFee: number;
  }
): EmailTemplate {
  const serviceAmount = data.totalAmount - data.serviceFee;
  
  const templateData: TemplateData = {
    clientName,
    professionalName: data.professionalName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    paymentMethod: data.paymentMethod,
    totalAmount: data.totalAmount.toFixed(2),
    serviceAmount: serviceAmount.toFixed(2),
    serviceFee: data.serviceFee.toFixed(2),
    bookingId: data.bookingId,
    reviewTipUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.bookingId}/balance`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('review-tip-notification', 'hbs');
  const textTemplate = loadTemplate('review-tip-notification', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: `Share your experience with ${data.professionalName} - The Suite`,
    htmlContent,
    textContent
  };
}

/**
 * Refund request notification to professional
 */
export function createRefundRequestNotificationEmail(
  professionalEmail: string,
  professionalName: string,
  data: {
    refundId: string;
    clientName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    originalAmount: number;
    reason: string;
    reviewUrl: string;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName,
    clientName: data.clientName,
    serviceName: data.serviceName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    originalAmount: data.originalAmount.toFixed(2),
    reason: data.reason,
    reviewUrl: data.reviewUrl,
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('refund-request-professional', 'hbs');
  const textTemplate = loadTemplate('refund-request-professional', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: professionalEmail, name: professionalName }],
    subject: 'Refund Request - Action Required',
    htmlContent,
    textContent
  };
}

/**
 * Refund decline notification to client
 */
export function createRefundDeclineNotificationEmail(
  clientEmail: string,
  clientName: string,
  data: {
    professionalName: string;
    serviceName: string;
    originalAmount: number;
    declinedReason?: string;
    professionalNotes?: string;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    clientName,
    professionalName: data.professionalName,
    serviceName: data.serviceName,
    originalAmount: data.originalAmount.toFixed(2),
    declinedReason: data.declinedReason,
    professionalNotes: data.professionalNotes,
    contactUrl: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('refund-decline-client', 'hbs');
  const textTemplate = loadTemplate('refund-decline-client', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Refund Request Update',
    htmlContent,
    textContent
  };
}

/**
 * Refund completion notification to client
 */
export function createRefundCompletionClientEmail(
  clientEmail: string,
  clientName: string,
  data: {
    professionalName: string;
    serviceName: string;
    originalAmount: number;
    refundAmount: number;
    professionalNotes?: string;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    clientName,
    professionalName: data.professionalName,
    serviceName: data.serviceName,
    originalAmount: data.originalAmount.toFixed(2),
    refundAmount: data.refundAmount.toFixed(2),
    professionalNotes: data.professionalNotes,
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('refund-completion-client', 'hbs');
  const textTemplate = loadTemplate('refund-completion-client', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: 'Refund Processed Successfully',
    htmlContent,
    textContent
  };
}

/**
 * Refund completion notification to professional
 */
export function createRefundCompletionProfessionalEmail(
  professionalEmail: string,
  professionalName: string,
  data: {
    clientName: string;
    serviceName: string;
    originalAmount: number;
    refundAmount: number;
    transactionFee: number;
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName,
    clientName: data.clientName,
    serviceName: data.serviceName,
    originalAmount: data.originalAmount.toFixed(2),
    refundAmount: data.refundAmount.toFixed(2),
    transactionFee: data.transactionFee.toFixed(2),
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('refund-completion-professional', 'hbs');
  const textTemplate = loadTemplate('refund-completion-professional', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: professionalEmail, name: professionalName }],
    subject: 'Refund Processed - Transaction Complete',
    htmlContent,
    textContent
  };
} 