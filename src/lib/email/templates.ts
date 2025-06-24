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
          const compiledItems = arrayData.map((item, index) => {
            let itemTemplate = loopTemplate;
            // Replace variables in the loop template
            if (typeof item === 'object' && item !== null) {
              for (const [key, value] of Object.entries(item)) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                itemTemplate = itemTemplate.replace(regex, String(value || ''));
              }
            }
            
            // Handle {{#unless @last}} helper
            const isLast = index === arrayData.length - 1;
            const unlessLastRegex = /{{#unless\s+@last}}(.*?){{\/unless}}/g;
            itemTemplate = itemTemplate.replace(unlessLastRegex, (match, content) => {
              return isLast ? '' : content;
            });
            
            // Handle {{@last}} variable directly
            const lastVarRegex = /{{@last}}/g;
            itemTemplate = itemTemplate.replace(lastVarRegex, isLast.toString());
            
            return itemTemplate;
          }).join('');
          
          result = result.replace(match, compiledItems);
        } else {
          result = result.replace(match, '');
        }
      }
    });
  }
  
  // Handle {{#if}} conditionals - support nested paths and nested conditionals
  const processConditionals = (text: string): string => {
    let processedText = text;
    
    // Find and process conditionals from innermost to outermost
    while (true) {
      // Find the first {{#if}} that has a matching {{/if}} without nested {{#if}} inside
      const matches: Array<{
        fullMatch: string;
        condition: string;
        content: string;
        start: number;
      }> = [];
      let currentPos = 0;
      
      while (currentPos < processedText.length) {
        const ifStart = processedText.indexOf('{{#if ', currentPos);
        if (ifStart === -1) break;
        
        // Extract the condition name
        const conditionMatch = processedText.substring(ifStart).match(/^{{#if\s+(\w+(?:\.\w+)*)}}/);
        if (!conditionMatch) {
          currentPos = ifStart + 1;
          continue;
        }
        
        const conditionName = conditionMatch[1];
        if (!conditionName) {
          currentPos = ifStart + 1;
          continue;
        }
        const conditionEnd = ifStart + conditionMatch[0].length;
        
        // Find the matching {{/if}}
        let depth = 1;
        let searchPos = conditionEnd;
        let contentEnd = -1;
        
        while (searchPos < processedText.length && depth > 0) {
          const nextIf = processedText.indexOf('{{#if ', searchPos);
          const nextEndIf = processedText.indexOf('{{/if}}', searchPos);
          
          if (nextEndIf === -1) break; // No matching {{/if}} found
          
          if (nextIf !== -1 && nextIf < nextEndIf) {
            // Found nested {{#if}}
            depth++;
            searchPos = nextIf + 6;
          } else {
            // Found {{/if}}
            depth--;
            if (depth === 0) {
              contentEnd = nextEndIf;
            }
            searchPos = nextEndIf + 7;
          }
        }
        
        if (contentEnd !== -1) {
          matches.push({
            fullMatch: processedText.substring(ifStart, contentEnd + 7),
            condition: conditionName,
            content: processedText.substring(conditionEnd, contentEnd),
            start: ifStart
          });
        }
        
        currentPos = ifStart + 1;
      }
      
      if (matches.length === 0) break; // No more conditionals to process
      
      // Process matches from right to left to avoid position shifts
      matches.sort((a, b) => b.start - a.start);
      
      for (const match of matches) {
        // Handle nested object paths like "refundInfo.refundAmount"
        let conditionValue: unknown = data;
        const pathParts = match.condition.split('.');
        for (const part of pathParts) {
          if (conditionValue && typeof conditionValue === 'object') {
            conditionValue = (conditionValue as Record<string, unknown>)[part];
          } else {
            conditionValue = undefined;
            break;
          }
        }
        
        // Show content if condition is truthy and not empty
        const shouldShow = conditionValue && 
          (typeof conditionValue !== 'string' || conditionValue.trim() !== '') &&
          (typeof conditionValue !== 'number' || conditionValue !== 0);
        
        const replacement = shouldShow ? match.content : '';
        processedText = processedText.substring(0, match.start) + replacement + processedText.substring(match.start + match.fullMatch.length);
      }
    }
    
    return processedText;
  };
  
  result = processConditionals(result);
  
  // Replace simple variables {{variable}} and nested {{object.property}}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      // Handle nested objects
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const nestedRegex = new RegExp(`{{\\s*${key}\\.${nestedKey}\\s*}}`, 'g');
        result = result.replace(nestedRegex, String(nestedValue || ''));
      }
    }
    
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

/**
 * Booking cancellation notification to client
 */
export function createBookingCancellationClientEmail(
  clientEmail: string,
  clientName: string,
  data: {
    bookingId: string;
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    professionalName: string;
    cancellationReason?: string;
    services: Array<{
      name: string;
      price: number;
    }>;
    refundInfo?: {
      originalAmount: number;
      refundAmount?: number;
      status: string;
    };
  }
): EmailTemplate {
  const templateData: TemplateData = {
    clientName,
    professionalName: data.professionalName,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    bookingId: data.bookingId,
    cancellationReason: data.cancellationReason,
    services: data.services.map(service => ({
      ...service,
      price: service.price.toFixed(2)
    })),
    refundInfo: data.refundInfo ? {
      originalAmount: data.refundInfo.originalAmount.toFixed(2),
      refundAmount: data.refundInfo.refundAmount?.toFixed(2),
      status: data.refundInfo.status
    } : undefined,
    appointmentDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.appointmentId}`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('booking-cancellation-client', 'hbs');
  const textTemplate = loadTemplate('booking-cancellation-client', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: clientEmail, name: clientName }],
    subject: `Booking Cancelled - ${data.appointmentDate}`,
    htmlContent,
    textContent
  };
}

/**
 * Booking cancellation notification to professional
 */
export function createBookingCancellationProfessionalEmail(
  professionalEmail: string,
  professionalName: string,
  data: {
    bookingId: string;
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    clientName: string;
    clientPhone?: string;
    cancellationReason?: string;
    services: Array<{
      name: string;
      price: number;
    }>;
    refundInfo?: {
      originalAmount: number;
      refundAmount?: number;
      status: string;
    };
  }
): EmailTemplate {
  const templateData: TemplateData = {
    professionalName,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    bookingId: data.bookingId,
    cancellationReason: data.cancellationReason,
    services: data.services.map(service => ({
      ...service,
      price: service.price.toFixed(2)
    })),
    refundInfo: data.refundInfo ? {
      originalAmount: data.refundInfo.originalAmount.toFixed(2),
      refundAmount: data.refundInfo.refundAmount?.toFixed(2),
      status: data.refundInfo.status
    } : undefined,
    appointmentDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.appointmentId}`,
    websiteUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    supportEmail: process.env.BREVO_ADMIN_EMAIL!
  };

  // Load and compile templates
  const htmlTemplate = loadTemplate('booking-cancellation-professional', 'hbs');
  const textTemplate = loadTemplate('booking-cancellation-professional', 'txt');
  
  const htmlContent = compileTemplate(htmlTemplate, templateData);
  const textContent = compileTemplate(textTemplate, templateData);

  return {
    to: [{ email: professionalEmail, name: professionalName }],
    subject: `Booking Cancelled - ${data.appointmentDate}`,
    htmlContent,
    textContent
  };
}

/**
 * Create no-show notification email for client
 */
export async function createNoShowNotificationClientEmail(
  clientName: string,
  professionalName: string,
  appointmentDate: string,
  appointmentTime: string,
  appointmentId: string,
  services: Array<{ name: string; price: number }>,
  chargeInfo?: {
    amount: number;
    percentage: number;
    originalAmount: number;
  },
  contactUrl: string = '',
  websiteUrl: string = ''
): Promise<{ subject: string; html: string; text: string }> {
  const data = {
    clientName,
    professionalName,
    appointmentDate,
    appointmentTime,
    appointmentId,
    services,
    chargeInfo,
    contactUrl,
    websiteUrl,
  };

  const htmlTemplate = loadTemplate('no-show-notification-client', 'hbs');
  const textTemplate = loadTemplate('no-show-notification-client', 'txt');

  const html = compileTemplate(htmlTemplate, data);
  const text = compileTemplate(textTemplate, data);

  const subject = chargeInfo 
    ? `Appointment No-Show - $${chargeInfo.amount.toFixed(2)} Fee Applied`
    : 'Appointment No-Show Notification';

  return { subject, html, text };
}

/**
 * Create no-show notification email for professional
 */
export async function createNoShowNotificationProfessionalEmail(
  professionalName: string,
  clientName: string,
  clientPhone: string | undefined,
  appointmentDate: string,
  appointmentTime: string,
  appointmentId: string,
  services: Array<{ name: string; price: number }>,
  chargeInfo?: {
    amount: number;
    percentage: number;
    originalAmount: number;
  },
  websiteUrl: string = ''
): Promise<{ subject: string; html: string; text: string }> {
  const data = {
    professionalName,
    clientName,
    clientPhone,
    appointmentDate,
    appointmentTime,
    appointmentId,
    services,
    chargeInfo,
    websiteUrl,
  };

  const htmlTemplate = loadTemplate('no-show-notification-professional', 'hbs');
  const textTemplate = loadTemplate('no-show-notification-professional', 'txt');

  const html = compileTemplate(htmlTemplate, data);
  const text = compileTemplate(textTemplate, data);

  const subject = chargeInfo 
    ? `No-Show Recorded - $${chargeInfo.amount.toFixed(2)} Fee Applied`
    : 'Client No-Show Recorded';

  return { subject, html, text };
}

/**
 * Create cancellation policy charge email for client
 */
export async function createCancellationPolicyChargeClientEmail(
  clientName: string,
  professionalName: string,
  appointmentDate: string,
  appointmentTime: string,
  bookingId: string,
  cancellationReason: string,
  services: Array<{ name: string; price: number }>,
  policyInfo: {
    chargeAmount: number;
    chargePercentage: number;
    serviceAmount: number;
    timeDescription: string;
  },
  refundInfo?: {
    originalAmount: number;
    refundAmount: number;
    status: string;
  },
  websiteUrl: string = ''
): Promise<{ subject: string; html: string; text: string }> {
  const data = {
    clientName,
    professionalName,
    appointmentDate,
    appointmentTime,
    bookingId,
    cancellationReason,
    services,
    policyInfo,
    refundInfo,
    websiteUrl,
  };

  const htmlTemplate = loadTemplate('cancellation-policy-charge-client', 'hbs');
  const textTemplate = loadTemplate('cancellation-policy-charge-client', 'txt');

  const html = compileTemplate(htmlTemplate, data);
  const text = compileTemplate(textTemplate, data);

  const subject = `Booking Cancelled - $${policyInfo.chargeAmount.toFixed(2)} Cancellation Fee Applied`;

  return { subject, html, text };
}

/**
 * Create cancellation policy charge email for professional
 */
export async function createCancellationPolicyChargeProfessionalEmail(
  professionalName: string,
  clientName: string,
  clientPhone: string | undefined,
  appointmentDate: string,
  appointmentTime: string,
  bookingId: string,
  cancellationReason: string,
  services: Array<{ name: string; price: number }>,
  policyInfo: {
    chargeAmount: number;
    chargePercentage: number;
    serviceAmount: number;
    timeDescription: string;
  },
  websiteUrl: string = ''
): Promise<{ subject: string; html: string; text: string }> {
  const data = {
    professionalName,
    clientName,
    clientPhone,
    appointmentDate,
    appointmentTime,
    bookingId,
    cancellationReason,
    services,
    policyInfo,
    websiteUrl,
  };

  const htmlTemplate = loadTemplate('cancellation-policy-charge-professional', 'hbs');
  const textTemplate = loadTemplate('cancellation-policy-charge-professional', 'txt');

  const html = compileTemplate(htmlTemplate, data);
  const text = compileTemplate(textTemplate, data);

  const subject = `Client Cancelled - $${policyInfo.chargeAmount.toFixed(2)} Fee Applied`;

  return { subject, html, text };
} 