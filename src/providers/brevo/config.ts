import * as Brevo from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const EMAIL_METHOD = process.env.EMAIL_METHOD || 'api';
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);

type TemplateContent = {
  subject: string;
  html: string;
};

export function getEmailMethod(): 'api' | 'local' {
  return EMAIL_METHOD === 'local' ? 'local' : 'api';
}

export function initEmailSender(): Brevo.TransactionalEmailsApi | nodemailer.Transporter {
  if (getEmailMethod() === 'local') {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
    });
  } else {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
    return apiInstance;
  }
}

async function getBrevoTemplatePreview(templateId: number, params: Record<string, unknown>): Promise<TemplateContent | null> {
  try {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
    
    const templateResponse = await apiInstance.getSmtpTemplate(templateId);
    const template = templateResponse.body;
    
    if (!template) {
      console.error(`Template ${templateId} not found`);
      return null;
    }

    // Get template preview with variables
    const previewResponse = await fetch('https://api.brevo.com/v3/smtp/template/preview', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ templateId, params }),
    });

    if (!previewResponse.ok) {
      throw new Error(`Failed to get template preview: ${previewResponse.statusText}`);
    }

    const preview = await previewResponse.json();

    console.log(preview);

    return {
      subject: preview.subject || template.name || '',
      html: preview.html || template.htmlContent || '',
    };
  } catch (error) {
    console.error('Error getting template preview:', error);
    return null;
  }
}

export async function getTemplateContent(
  templateId: number,
  params: Record<string, unknown>
): Promise<TemplateContent | null> {
  // Always try to get the preview from Brevo first
  const preview = await getBrevoTemplatePreview(templateId, params);
  if (preview) {
    return preview;
  }

  // Fallback to a basic template if preview fails
  return {
    subject: `Test Email - Template ${templateId}`,
    html: `
      <h1>Test Email - Template ${templateId}</h1>
      <pre>${JSON.stringify(params, null, 2)}</pre>
    `,
  };
} 