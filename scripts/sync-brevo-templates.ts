import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local if it exists
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:');
  missingEnvVars.forEach(key => console.error(`- ${key}`));
  console.error('\nPlease ensure these variables are set in your .env.local file');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BREVO_API_KEY = process.env.BREVO_API_KEY!;

type EmailTemplate = {
  id: string;
  name: string;
  tag: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  subject: string;
  html_content: string;
  to_field: string;
  is_active: boolean;
};

// Add type for Brevo template response
type BrevoTemplate = {
  id: number;
  name: string;
  tag: string;
  htmlContent: string;
  subject: string;
  isActive: boolean;
};

type BrevoTemplatesResponse = {
  templates: BrevoTemplate[];
};

async function syncTemplateToBrevo(template: EmailTemplate) {
  try {
    // First check if template exists by tag
    const checkResponse = await fetch('https://api.brevo.com/v3/smtp/templates', {
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      throw new Error(`Failed to fetch templates from Brevo: ${checkResponse.statusText}`);
    }

    const existingTemplates = (await checkResponse.json()) as BrevoTemplatesResponse;
    const existingTemplate = existingTemplates.templates?.find(
      (t) => t.tag === template.tag
    );

    // if (template.tag === 'BookingConfirmationClient') {
    //   console.log(template.html_content);
    // }

    const templateData = {
      sender: {
        name: template.sender_name,
        email: template.sender_email,
      },
      templateName: template.name,
      subject: template.subject,
      htmlContent: template.html_content.trim(),
      replyTo: template.reply_to,
      toField: template.to_field,
      tag: template.tag,
      isActive: template.is_active,
    };

    if (existingTemplate) {
      // Update existing template
      console.log(`Updating template: ${template.name}`);
      const updateResponse = await fetch(
        `https://api.brevo.com/v3/smtp/templates/${existingTemplate.id}`,
        {
          method: 'PUT',
          headers: {
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify(templateData),
        }
      );

      const responseText = await updateResponse.text();
      console.log(`Update response for ${template.name} (Status ${updateResponse.status}):`, responseText);
      
      if (!updateResponse.ok) {
        throw new Error(
          `Failed to update template: ${template.name}. Status: ${updateResponse.status}. Response: ${responseText}`
        );
      }

      console.log(`Successfully updated template: ${template.name} (ID: ${existingTemplate.id})`);
      return existingTemplate.id;
    } else {
      // Create new template
      console.log(`Creating template: ${template.name}`);
      const createResponse = await fetch('https://api.brevo.com/v3/smtp/templates', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(
          `Failed to create template: ${template.name}. Status: ${createResponse.status}. Error: ${JSON.stringify(errorData)}`
        );
      }

      const newTemplate = (await createResponse.json()) as { id: number };
      console.log(`Successfully created template: ${template.name} (ID: ${newTemplate.id})`);
      return newTemplate.id;
    }
  } catch (error) {
    console.error(`Error syncing template ${template.name}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Initializing Supabase client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('Fetching templates from database...');
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!templates?.length) {
      console.log('No active templates found in database');
      return;
    }

    console.log(`Found ${templates.length} templates to sync`);

    // Track results
    const results: { name: string; id: number | null; status: 'success' | 'error'; error?: string }[] = [];

    // Sync each template
    for (const template of templates) {
      try {
        const templateId = await syncTemplateToBrevo(template);
        results.push({
          name: template.name,
          id: templateId,
          status: 'success'
        });
      } catch (error) {
        console.error(`Failed to sync template ${template.name}:`, error);
        results.push({
          name: template.name,
          id: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Print summary
    console.log('\nSync Summary:');
    console.log('=============');
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(`✓ ${result.name} (ID: ${result.id})`);
      } else {
        console.log(`✗ ${result.name} - Failed: ${result.error}`);
      }
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    console.log('\nFinal Results:');
    console.log(`Successfully synced: ${successCount}`);
    console.log(`Failed: ${errorCount}`);

  } catch (error) {
    console.error('Error during template sync:', error);
    process.exit(1);
  }
}

main();