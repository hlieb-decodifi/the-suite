import nodemailer from 'nodemailer';
import { EmailTemplate } from '../templates';

type EmailMethod = 'api' | 'smtp' | 'local';

type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  method: EmailMethod;
};

function getEmailMethod(): EmailMethod {
  const method = process.env.EMAIL_METHOD as EmailMethod;
  
  // Default to local in development, API in production
  if (!method) {
    return process.env.NODE_ENV === 'development' ? 'local' : 'api';
  }
  
  return method;
}

async function sendEmailViaAPI(template: EmailTemplate): Promise<EmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is required for API method');
  }

  const sender = template.sender || {
    email: process.env.BREVO_SENDER_EMAIL!,
    name: process.env.BREVO_SENDER_NAME || 'The Suite'
  };

  const payload = {
    sender,
    to: template.to,
    subject: template.subject,
    htmlContent: template.htmlContent,
    ...(template.textContent && { textContent: template.textContent })
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return { 
    success: true, 
    messageId: result.messageId,
    method: 'api'
  };
}

async function sendEmailViaSMTP(template: EmailTemplate): Promise<EmailResult> {
  const method = getEmailMethod();
  
  let transportConfig;
  
  if (method === 'local') {
    // Local Mailpit configuration
    transportConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false, // Mailpit doesn't use SSL
      auth: undefined, // No auth for local Mailpit
    };
  } else {
    // Brevo SMTP configuration
    transportConfig = {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD || process.env.BREVO_API_KEY,
      },
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);

  const sender = template.sender || {
    email: process.env.BREVO_SENDER_EMAIL!,
    name: process.env.BREVO_SENDER_NAME || 'The Suite'
  };

  const mailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: template.to.map(recipient => 
      recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email
    ).join(', '),
    subject: template.subject,
    text: template.textContent,
    html: template.htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  
  return {
    success: true,
    messageId: info.messageId,
    method: method
  };
}

export async function sendEmail(template: EmailTemplate): Promise<EmailResult> {
  try {
    const method = getEmailMethod();
    
    console.log(`📧 Sending email via ${method} method...`);
    
    let result: EmailResult;
    
    if (method === 'api') {
      result = await sendEmailViaAPI(template);
    } else {
      result = await sendEmailViaSMTP(template);
    }
    
    console.log(`✅ Email sent successfully via ${result.method}:`, result.messageId);
    
    if (method === 'local') {
      console.log('📬 View emails at: http://localhost:8025');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      method: getEmailMethod()
    };
  }
} 