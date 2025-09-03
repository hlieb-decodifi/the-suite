'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  sendBookingCancellationClient,
  sendBookingCancellationProfessional,
  sendBookingCancellationWithinAcceptedTimePeriodProfessional,
  sendBookingCancellationWithinAcceptedTimePeriodClient,
  sendBookingConfirmationClient,
  sendBookingConfirmationProfessional,
  sendPaymentConfirmationClient,
  sendPaymentConfirmationProfessional,
  sendAppointmentCompletion2hafterClient,
  sendAppointmentCompletion2hafterProfessional,
  sendBalanceNotification,

  sendReviewTipNotification,
  sendContactInquiryAdmin,
  sendContactInquiryConfirmation,
  sendBookingCancellationLessthan24h48hclient,
  sendBookingCancellationLessthan24h48hprofessional,
  sendBookingCancellationNoShowClient,
  sendBookingCancellationNoShowProfessional,
  sendSupportRequestCreation,
  sendSupportRequestResolvedClient,
  sendSupportRequestResolvedProfessional,
  sendSupportRequestRefundedClient,
  sendSupportRequestRefundedProfessional
} from '@/providers/brevo/templates';
import { type EmailResult, type EmailRecipient } from '@/providers/brevo/types';

// Database schema (after migration is applied)
// Using EmailTemplate type directly since it matches the new schema

// Target schema (after migration is applied)
export type EmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  tag: string;
  brevo_template_id: number;
  dynamic_params: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SendTestEmailParams = {
  templateTag: string;
  recipientEmail: string;
  params: Record<string, unknown>;
};

export type SendTestEmailResult = {
  success: boolean;
  messageId?: string;
  template?: string;
  error?: string;
};

// Mapping of template tags to their typed email functions
const emailFunctionMap = {
  'BookingCancellationClient': sendBookingCancellationClient,
  'BookingCancellationProfessional': sendBookingCancellationProfessional,
  'BookingCancellationWithinAcceptedTimePeriodProfessional': sendBookingCancellationWithinAcceptedTimePeriodProfessional,
  'BookingCancellationWithinAcceptedTimePeriodClient': sendBookingCancellationWithinAcceptedTimePeriodClient,
  'BookingConfirmationClient': sendBookingConfirmationClient,
  'BookingConfirmationProfessional': sendBookingConfirmationProfessional,
  'PaymentConfirmationClient': sendPaymentConfirmationClient,
  'PaymentConfirmationProfessional': sendPaymentConfirmationProfessional,
  'AppointmentCompletion2hafterClient': sendAppointmentCompletion2hafterClient,
  'AppointmentCompletion2hafterProfessional': sendAppointmentCompletion2hafterProfessional,
  'BalanceNotification': sendBalanceNotification,

  'ReviewTipNotification': sendReviewTipNotification,
  'ContactInquiryAdmin': sendContactInquiryAdmin,
  'ContactInquiryConfirmation': sendContactInquiryConfirmation,
  'BookingCancellationLessthan24h48hclient': sendBookingCancellationLessthan24h48hclient,
  'BookingCancellationLessthan24h48hprofessional': sendBookingCancellationLessthan24h48hprofessional,
  'BookingCancellationNoShowClient': sendBookingCancellationNoShowClient,
  'BookingCancellationNoShowProfessional': sendBookingCancellationNoShowProfessional,
  'SupportRequestCreation': sendSupportRequestCreation,
  'SupportRequestResolvedClient': sendSupportRequestResolvedClient,
  'SupportRequestResolvedProfessional': sendSupportRequestResolvedProfessional,
  'SupportRequestRefundedClient': sendSupportRequestRefundedClient,
  'SupportRequestRefundedProfessional': sendSupportRequestRefundedProfessional,
} as const;

// Note: brevo_template_id is now fetched directly from the database

// Dynamic parameters are now stored directly in the database

// Server action to get all email templates
export async function getEmailTemplates(): Promise<{ templates: EmailTemplate[] } | { error: string }> {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return { error: 'Admin access required' };
    }

    // Use admin client for database operations
    const adminSupabase = await createAdminClient();
    
    const { data: dbTemplates, error } = await adminSupabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching email templates:', error);
      return { error: 'Failed to fetch email templates' };
    }

    // Ensure database has been migrated to new schema
    if (!dbTemplates || dbTemplates.length === 0) {
      return { templates: [] };
    }

    // Check if migration has been applied by verifying first template has new schema
    const firstTemplate = dbTemplates[0] as Record<string, unknown>;
    if (!('brevo_template_id' in firstTemplate) || !('dynamic_params' in firstTemplate)) {
      return { 
        error: 'Database migration required: email_templates table is missing brevo_template_id and dynamic_params columns. Please apply the migration first.' 
      };
    }

    const templates: EmailTemplate[] = dbTemplates as unknown as EmailTemplate[];

    return { templates };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { error: 'Internal server error' };
  }
}



// Helper function to generate sample parameters for a template
export async function generateSampleParams(dynamicParams: string[]): Promise<Record<string, unknown>> {
  const sampleData: Record<string, unknown> = {};
  
  for (const param of dynamicParams) {
    switch (param) {
      case 'professional_name':
        sampleData[param] = 'Dr. Sarah Johnson';
        break;
      case 'client_name':
        sampleData[param] = 'John Doe';
        break;
      case 'client_phone':
        sampleData[param] = '+1-555-0123';
        break;
      case 'date':
        sampleData[param] = new Date(Date.now() + 86400000).toLocaleDateString(); // tomorrow
        break;
      case 'time':
        sampleData[param] = '2:00 PM';
        break;
      case 'booking_id':
        sampleData[param] = 'BK-123456';
        break;
      case 'services':
        sampleData[param] = [
          { name: 'Hair Cut & Style', price: '85.00', duration: 30 },
          { name: 'Hair Color', price: '120.00', duration: 60 }
        ];
        break;
      case 'subtotal':
        sampleData[param] = '205.00';
        break;
      case 'service_fee':
        sampleData[param] = '1.00';
        break;
      case 'tip_amount':
        sampleData[param] = '40.00';
        break;
      case 'total':
        sampleData[param] = '246.00';
        break;
      case 'payment_method':
        sampleData[param] = 'Credit Card';
        break;
      case 'deposit_amount':
        sampleData[param] = '51.25';
        break;
      case 'balance_due':
        sampleData[param] = '194.75';
        break;
      case 'professional_total':
        sampleData[param] = '245.00';
        break;
      case 'appointment_details_url':
        sampleData[param] = 'https://thesuiteservice.com/bookings/123456';
        break;
      case 'website_url':
        sampleData[param] = 'https://thesuiteservice.com';
        break;
      case 'support_email':
        sampleData[param] = 'support@thesuiteservice.com';
        break;
      case 'cancellation_reason':
        sampleData[param] = 'Emergency came up, need to reschedule';
        break;
      case 'original_amount':
        sampleData[param] = '205.00';
        break;
      case 'refund_amount':
        sampleData[param] = '153.75';
        break;
      case 'reason':
        sampleData[param] = 'Service quality did not meet expectations';
        break;
      case 'decline_reason':
        sampleData[param] = 'Service was provided as agreed upon';
        break;
      case 'no_show_fee':
        sampleData[param] = '25.00';
        break;
      case 'review_url':
        sampleData[param] = 'https://thesuiteservice.com/review/123456';
        break;
      case 'name':
        sampleData[param] = 'Alex Thompson';
        break;
      case 'email':
        sampleData[param] = 'alex@example.com';
        break;
      case 'phone':
        sampleData[param] = '+1-555-0456';
        break;
      case 'subject':
        sampleData[param] = 'Question about booking process';
        break;
      case 'message':
        sampleData[param] = 'I have a question about how to book an appointment and what the cancellation policy is.';
        break;
      case 'inquiry_id':
        sampleData[param] = 'INQ-789012';
        break;
      case 'urgency':
        sampleData[param] = 'medium';
        break;
      case 'urgency_color':
        sampleData[param] = '#ff9800';
        break;
      case 'dashboard_url':
        sampleData[param] = 'https://thesuiteservice.com/admin/inquiries';
        break;
      case 'submitted_at':
        sampleData[param] = new Date().toLocaleString();
        break;
      case 'policy_info':
        sampleData[param] = {
          charge_amount: '51.25',
          charge_percentage: '25',
          service_amount: '205.00',
          time_description: 'cancelled within 48 hours of appointment'
        };
        break;
      case 'payment':
        sampleData[param] = {
          method: { name: 'Credit Card', is_online: true }
        };
        break;
      case 'refund_info':
        sampleData[param] = {
          original_amount: '205.00',
          refund_amount: '153.75',
          status: 'processed'
        };
        break;
      
      // Support Request parameters
      case 'support_request_url':
        sampleData[param] = 'https://thesuite.example.com/support-request/sr-123456';
        break;
      case 'address':
        sampleData[param] = '123 Main St, New York, NY 10001, USA';
        break;
      case 'date_and_time':
        sampleData[param] = 'Monday, December 25, 2023 at 2:00 PM';
        break;
      case 'refund_method':
        sampleData[param] = 'Credit Card';
        break;
        
      default:
        sampleData[param] = `Sample ${param.replace(/_/g, ' ')}`;
    }
  }
  
  return sampleData;
}

// Test Brevo connectivity and template access
export async function testBrevoConnection(): Promise<{ success: boolean; message: string; templateCount?: number }> {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    
    if (!brevoApiKey) {
      return {
        success: false,
        message: 'BREVO_API_KEY environment variable is not set'
      };
    }

    // Test API connectivity by getting account info
    const accountResponse = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
      },
    });

    if (!accountResponse.ok) {
      return {
        success: false,
        message: `Brevo API authentication failed: ${accountResponse.statusText}`
      };
    }

    // Test template access by getting template list
    const templatesResponse = await fetch('https://api.brevo.com/v3/smtp/templates', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
      },
    });

    if (!templatesResponse.ok) {
      return {
        success: false,
        message: `Failed to access Brevo templates: ${templatesResponse.statusText}`
      };
    }

    const templatesData = await templatesResponse.json();
    const templateCount = templatesData.templates?.length || 0;

    return {
      success: true,
      message: `Successfully connected to Brevo. Account has ${templateCount} email templates.`,
      templateCount
    };

  } catch (error) {
    return {
      success: false,
      message: `Error testing Brevo connection: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Server action to sync Brevo template parameters with database
export async function syncBrevoTemplateParams(): Promise<{ success: boolean; message: string; updated?: number }> {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    
    if (!brevoApiKey) {
      return {
        success: false,
        message: 'BREVO_API_KEY environment variable is not set'
      };
    }

    // Use admin client for database operations
    const adminSupabase = await createAdminClient();
    
    // Get all email templates from database using admin client
    const { data: dbTemplates, error: dbError } = await adminSupabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true);

    if (dbError || !dbTemplates) {
      return {
        success: false,
        message: `Failed to fetch templates from database: ${dbError?.message}`
      };
    }

    let updatedCount = 0;
    const results: Array<{ tag: string; status: string; params?: string[] }> = [];

    for (const template of dbTemplates) {
      try {
        // Check if migration has been applied
        const templateData = template as Record<string, unknown>;
        if (!('brevo_template_id' in templateData) || !('dynamic_params' in templateData)) {
          return {
            success: false,
            message: 'Database migration required: email_templates table is missing brevo_template_id and dynamic_params columns. Please apply the migration first.'
          };
        }

        const typedTemplate = template as unknown as EmailTemplate;
        
        console.log(`Syncing template: ${typedTemplate.tag} (Brevo ID: ${typedTemplate.brevo_template_id})`);
        
        // Fetch template details from Brevo
        const templateResponse = await fetch(`https://api.brevo.com/v3/smtp/templates/${typedTemplate.brevo_template_id}`, {
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
          },
        });

        if (!templateResponse.ok) {
          results.push({
            tag: typedTemplate.tag,
            status: `Failed to fetch from Brevo: ${templateResponse.statusText}`
          });
          continue;
        }

        const brevoTemplate = await templateResponse.json();
        
        // Extract parameters from template content
        const htmlContent = (brevoTemplate.htmlContent as string) || '';
        const subject = (brevoTemplate.subject as string) || '';
        const textContent = (brevoTemplate.textContent as string) || '';

        console.log('Brevo template:', brevoTemplate);
        console.log('HTML content:', htmlContent);
        console.log('Subject:', subject);
        console.log('Text content:', textContent);
        
        // Find all variable patterns including arrays and object properties
        const directParamRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
        const nestedParamRegex = /\{\{\s*params\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
        const arrayParamRegex = /{%\s*for\s+\w+\s+in\s+params\.([a-zA-Z_][a-zA-Z0-9_]*)\s*%}/g;
        // const objectPropertyRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
        const paramSet = new Set<string>();
        
        // Function to extract parameters from content using all patterns
        const extractFromContent = (content: string) => {
          let match;
          
          // Extract direct variables ({{ variable_name }})
          const directRegex = new RegExp(directParamRegex.source, 'g');
          while ((match = directRegex.exec(content)) !== null) {
            if (match[1] && match[1] !== 'mirror') {
              paramSet.add(match[1]);
            }
          }
          
          // Extract nested variables ({{ params.variable_name }})
          const nestedRegex = new RegExp(nestedParamRegex.source, 'g');
          while ((match = nestedRegex.exec(content)) !== null) {
            if (match[1] && match[1] !== 'mirror') {
              paramSet.add(match[1]);
            }
          }
          
          // Extract array parameters and their object properties from for loops
          const forLoopRegex = /{%\s*for\s+(\w+)\s+in\s+params\.([a-zA-Z_][a-zA-Z0-9_]*)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;
          while ((match = forLoopRegex.exec(content)) !== null) {
            const loopVar = match[1];  // e.g., 'item'
            const arrayName = match[2]; // e.g., 'services'
            const loopContent = match[3]; // content between {% for %} and {% endfor %}
            
            // Add the array parameter
            if (arrayName && arrayName !== 'mirror') {
              paramSet.add(arrayName);
            }
            
            // Extract object properties used within the loop ({{ item.property }})
            if (loopVar && loopContent) {
              const objectPropertyRegex = new RegExp(`\\{\\{\\s*${loopVar}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\}\\}`, 'g');
              let propertyMatch;
              while ((propertyMatch = objectPropertyRegex.exec(loopContent)) !== null) {
                const propertyName = propertyMatch[1];
                if (propertyName && propertyName !== 'mirror') {
                  // Store as "arrayName.propertyName" to indicate it's a property of array items
                  paramSet.add(`${arrayName}.${propertyName}`);
                }
              }
            }
          }
          
          // Fallback: Extract simple array parameters for any for loops that weren't captured above
          const arrayRegex = new RegExp(arrayParamRegex.source, 'g');
          while ((match = arrayRegex.exec(content)) !== null) {
            if (match[1] && match[1] !== 'mirror') {
              paramSet.add(match[1]);
            }
          }
        }
        
        // Extract from all content
        extractFromContent(htmlContent);
        extractFromContent(subject);
        extractFromContent(textContent);
        
        const extractedParams = Array.from(paramSet).sort();
        const currentParams = typedTemplate.dynamic_params || [];

        console.log('Extracted params:', extractedParams);
        console.log('Current params:', currentParams);
        
        // Check if parameters have changed
        const paramsChanged = JSON.stringify(extractedParams) !== JSON.stringify(currentParams);

        console.log('Params changed:', paramsChanged);
        
        if (paramsChanged) {
          // Update database with new parameters
          console.log(`Updating template ${typedTemplate.tag} with params:`, extractedParams);
          
          const { data: updateData, error: updateError } = await adminSupabase
            .from('email_templates')
            .update({ dynamic_params: extractedParams } as Record<string, unknown>)
            .eq('id', typedTemplate.id)
            .select();

          console.log('Update result:', { updateData, updateError });

          if (updateError) {
            console.error('Database update error:', updateError);
            results.push({
              tag: typedTemplate.tag,
              status: `Failed to update database: ${updateError.message}`
            });
          } else if (!updateData || updateData.length === 0) {
            console.error('No rows updated - template ID might not exist:', typedTemplate.id);
            results.push({
              tag: typedTemplate.tag,
              status: 'Failed to update: No matching template found in database'
            });
          } else {
            updatedCount++;
            console.log('Successfully updated template:', typedTemplate.tag);
            results.push({
              tag: typedTemplate.tag,
              status: 'Updated successfully',
              params: extractedParams
            });
          }
        } else {
          results.push({
            tag: typedTemplate.tag,
            status: 'No changes needed',
            params: extractedParams
          });
        }

      } catch (error) {
        results.push({
          tag: (template as Record<string, unknown>).tag as string || 'Unknown',
          status: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    console.log('Sync results:', results);

    return {
      success: true,
      message: `Sync completed. Updated ${updatedCount} templates out of ${dbTemplates.length} total.`,
      updated: updatedCount
    };

  } catch (error) {
    return {
      success: false,
      message: `Error syncing templates: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Server action to send test email using typed functions
export async function sendTestEmail(params: SendTestEmailParams): Promise<SendTestEmailResult> {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }

    const { templateTag, recipientEmail, params: emailParams } = params;

    // Validate input
    if (!templateTag || !recipientEmail) {
      return {
        success: false,
        error: 'Template tag and recipient email are required'
      };
    }

    // Get the appropriate email function for this template
    const emailFunction = emailFunctionMap[templateTag as keyof typeof emailFunctionMap];
    
    if (!emailFunction) {
      return {
        success: false,
        error: `No email function found for template: ${templateTag}`
      };
    }

    // Get template from database for the name using admin client
    const adminSupabase = await createAdminClient();
    const { data: dbTemplate, error } = await adminSupabase
      .from('email_templates')
      .select('name')
      .eq('tag', templateTag)
      .eq('is_active', true)
      .single();

    if (error || !dbTemplate) {
      return {
        success: false,
        error: `Template not found: ${templateTag}`
      };
    }

    // Prepare recipient array
    const recipients: EmailRecipient[] = [{
      email: recipientEmail,
      name: 'Test User'
    }];

    // Debug: Log the parameters being sent
    console.log('Sending email with parameters:', {
      templateTag,
      recipientEmail,
      emailParams,
      recipients
    });

    // Send email using the typed function
    // Note: We cast to the expected function signature since we're dealing with dynamic test data
    type EmailFunction = (recipients: EmailRecipient[], params: Record<string, unknown>) => Promise<EmailResult>;
    const result: EmailResult = await (emailFunction as EmailFunction)(recipients, emailParams);
    
    console.log('Email send result:', result);
    
    return {
      success: result.success,
      ...(result.messageId && { messageId: result.messageId }),
      template: dbTemplate.name,
      ...(result.error && { error: result.error })
    };

  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
