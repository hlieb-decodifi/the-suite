import * as Brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

export type EmailMethod = 'api' | 'smtp' | 'local';

export function getEmailMethod(): EmailMethod {
  const method = process.env.EMAIL_METHOD as EmailMethod;
  return method || (process.env.NODE_ENV === 'development' ? 'local' : 'api');
}

export type EmailSender = Brevo.TransactionalEmailsApi | nodemailer.Transporter;

function replaceTemplateVariables(content: string, params: Record<string, unknown>): string {
  let result = content;

  // Handle for loops in the template
  const forLoopRegex = /{%\s*for\s+(\w+)\s+in\s+params\.(\w+)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;
  result = result.replace(forLoopRegex, (match, itemVar: string, arrayName: string, loopContent: string) => {
    const arrayValue = params[arrayName];
    if (!Array.isArray(arrayValue)) {
      return match; // Keep original if not an array
    }

    return arrayValue.map(item => {
      const itemContent = loopContent;
      // Replace item variables within the loop
      const itemVarRegex = new RegExp(`{{\\s*${itemVar}\\.([\\w.]+)\\s*}}`, 'g');
      return itemContent.replace(itemVarRegex, (_: string, prop: string) => {
        return String((item as Record<string, unknown>)[prop] || '');
      });
    }).join('\n');
  });

  // Handle regular variables
  function processValue(key: string, value: unknown): void {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Replace {{ params.key }} format
      result = result.replace(
        new RegExp(`{{\\s*params.${key}\\s*}}`, 'g'),
        String(value)
      );
      // Also try {{ key }} format
      result = result.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
        String(value)
      );
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle nested objects
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
        processValue(`${key}.${nestedKey}`, nestedValue);
      });
    }
    // Arrays are now handled by the for loop replacement above
  }

  // Process all parameters
  Object.entries(params).forEach(([key, value]) => {
    processValue(key, value);
  });

  return result;
}

export async function getTemplateContent(templateId: number, params: Record<string, unknown>): Promise<{ html: string; subject: string } | null> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log('BREVO_API_KEY not found, template preview will not be available');
    return null;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/templates/' + templateId, {
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const template = await response.json();
    
    // Replace variables in both subject and body
    const htmlContent = replaceTemplateVariables(template.htmlContent, params);
    const subject = replaceTemplateVariables(template.subject, params);

    return {
      html: htmlContent,
      subject
    };
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

export function initEmailSender(): EmailSender {
  const method = getEmailMethod();

  if (method === 'local') {
    // Configure for local SMTP (Mailpit)
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    
    return nodemailer.createTransport({
      host,
      port,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Configure for Brevo API
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is required for API mode');
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return apiInstance;
} 