import { createClient } from '@/lib/supabase/server';

export type EmailTemplateRecord = {
  id: string;
  name: string;
  tag: string;
  brevo_template_id: number;
};

// Cache for template IDs to avoid frequent database lookups
let templateCache: Record<string, number> | null = null;

/**
 * Fetches all email template IDs from the database and caches them
 */
export async function getEmailTemplateIds(): Promise<Record<string, number>> {
  // Return cached result if available
  if (templateCache !== null) {
    return templateCache;
  }
  
  const supabase = await createClient();
  
  // Fetch all active templates with their IDs
  const { data, error } = await supabase
    .from('email_templates')
    .select('tag, brevo_template_id')
    .eq('is_active', true)
    .not('brevo_template_id', 'is', null);
    
  if (error) {
    console.error('Error fetching email template IDs:', error);
    throw new Error('Failed to fetch email template IDs');
  }
  
  // Create a mapping of tag to template ID
  const templates = data.reduce((acc, template) => {
    // Convert tag like 'BookingConfirmationClient' to a constant-like key 'BOOKING_CONFIRMATION_CLIENT'
    const key = template.tag
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase();
    
    acc[key] = template.brevo_template_id;
    return acc;
  }, {} as Record<string, number>);
  
  // Cache the result
  templateCache = templates;
  
  return templates;
}

/**
 * Invalidates the template cache, forcing the next call to getEmailTemplateIds to fetch fresh data
 */
export function invalidateTemplateCache(): void {
  templateCache = null;
}

/**
 * Updates a template's Brevo ID in the database
 */
export async function updateTemplateBrevoId(tag: string, brevoTemplateId: number): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('email_templates')
    .update({ brevo_template_id: brevoTemplateId })
    .eq('tag', tag);
    
  if (error) {
    console.error(`Error updating Brevo ID for template ${tag}:`, error);
    throw new Error(`Failed to update Brevo ID for template ${tag}`);
  }
  
  // Invalidate cache after updating
  invalidateTemplateCache();
} 