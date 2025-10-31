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

export function initEmailSender():
  | Brevo.TransactionalEmailsApi
  | nodemailer.Transporter {
  if (getEmailMethod() === 'local') {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
    });
  } else {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      BREVO_API_KEY,
    );
    return apiInstance;
  }
}

async function getBrevoTemplatePreview(
  templateId: number,
  params: Record<string, unknown>,
): Promise<TemplateContent | null> {
  try {
    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not set. Cannot fetch template content.');
      return null;
    }

    console.log(`Fetching Brevo template ${templateId} with params:`, params);

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      BREVO_API_KEY,
    );

    // First, get the template to verify it exists
    const templateResponse = await apiInstance.getSmtpTemplate(templateId);
    const template = templateResponse.body;

    if (!template) {
      console.error(`Template ${templateId} not found in Brevo account`);
      return null;
    }

    console.log(`Template ${templateId} found: ${template.name}`);

    // Try to get template preview with variables populated
    const previewResponse = await fetch(
      'https://api.brevo.com/v3/smtp/template/preview',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          params,
          email: 'hlieb@decodifi.uk',
        }),
      },
    );

    if (!previewResponse.ok) {
      const errorText = await previewResponse.text();
      console.error(
        `Failed to get template preview: ${previewResponse.statusText}`,
        errorText,
      );

      // Fallback to template content without variable substitution
      console.log(
        'Falling back to template content without variable substitution',
      );
      return {
        subject: template.subject || template.name || `Template ${templateId}`,
        html: template.htmlContent || '<p>Template content not available</p>',
      };
    }

    const preview = await previewResponse.json();
    console.log(`Successfully got template preview for ${templateId}`);

    return {
      subject:
        preview.subject ||
        template.subject ||
        template.name ||
        `Template ${templateId}`,
      html:
        preview.html ||
        template.htmlContent ||
        '<p>Template content not available</p>',
    };
  } catch (error) {
    console.error('Error getting template preview:', error);

    // If we have a template ID error, provide more specific guidance
    if (error instanceof Error && error.message.includes('404')) {
      console.error(
        `Template ${templateId} does not exist in your Brevo account. Please check the template ID.`,
      );
    }

    return null;
  }
}

export async function getTemplateContent(
  templateId: number,
  params: Record<string, unknown>,
): Promise<TemplateContent | null> {
  // Always try to get the preview from Brevo first
  const preview = await getBrevoTemplatePreview(templateId, params);

  // Return the preview if successful, otherwise null (no fallback)
  // This ensures we always use real Brevo templates or fail explicitly
  return preview;
}
