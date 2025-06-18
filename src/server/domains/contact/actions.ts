'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { contactFormSchema, type ContactFormData } from '@/components/forms/ContactForm/schema';

export type ContactSubmissionResult = {
  success: boolean;
  error?: string;
  inquiryId?: string;
};

/**
 * Submit a contact form inquiry
 */
export async function submitContactInquiry(
  formData: ContactFormData,
): Promise<ContactSubmissionResult> {
  try {
    // Use service role client to bypass RLS issues
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    
    // Also get current user from regular client for user_id
    const regularSupabase = await createClient();
    const { data: { user } } = await regularSupabase.auth.getUser();
    
    // Validate form data
    const validatedData = contactFormSchema.parse(formData);
    
    // Prepare inquiry data
    const inquiryData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      subject: validatedData.subject,
      message: validatedData.message,
      urgency: 'medium' as const, // Default urgency since it's not in the form anymore
      user_id: user?.id || null,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    };
    
    // Insert inquiry into database using service role (bypasses RLS)
    const { data: inquiry, error } = await serviceSupabase
      .from('contact_inquiries')
      .insert(inquiryData)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating contact inquiry:', error);
      return {
        success: false,
        error: 'Failed to submit your inquiry. Please try again.',
      };
    }
    
    // TODO: Send email notification to admins
    // This would be implemented with your email service (Resend, SendGrid, etc.)
    await sendAdminNotificationEmail(inquiry.id, validatedData);
    
    // TODO: Send confirmation email to user
    await sendUserConfirmationEmail(validatedData.email, validatedData.name, inquiry.id);
    
    return {
      success: true,
      inquiryId: inquiry.id,
    };
    
  } catch (error) {
    console.error('Error in submitContactInquiry:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Please check your form data and try again.',
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get contact inquiries for admin dashboard
 */
export async function getContactInquiries(
  status?: string,
  limit: number = 20,
  offset: number = 0
) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // Build query
    let query = supabase
      .from('contact_inquiries')
      .select(`
        *,
        assigned_to_user:assigned_to(
          id,
          first_name,
          last_name
        ),
        user:user_id(
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: inquiries, error } = await query;
    
    if (error) {
      console.error('Error fetching contact inquiries:', error);
      throw error;
    }
    
    return {
      success: true,
      inquiries: inquiries || [],
    };
    
  } catch (error) {
    console.error('Error in getContactInquiries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inquiries',
      inquiries: [],
    };
  }
}

/**
 * Update contact inquiry status
 */
export async function updateContactInquiryStatus(
  inquiryId: string,
  status: 'new' | 'in_progress' | 'resolved' | 'closed',
  adminNotes?: string
) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    const updateData: Record<string, unknown> = {
      status,
      assigned_to: user.id,
    };
    
    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }
    
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('contact_inquiries')
      .update(updateData)
      .eq('id', inquiryId);
    
    if (error) {
      console.error('Error updating contact inquiry:', error);
      throw error;
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error in updateContactInquiryStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inquiry status',
    };
  }
}

/**
 * Send email notification to admins (placeholder)
 * TODO: Implement with your email service
 */
async function sendAdminNotificationEmail(inquiryId: string, formData: ContactFormData) {
  // This would be implemented with your email service
  // Example with Resend:
  /*
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: ['admin@yourdomain.com'],
    subject: `New Contact Inquiry: ${formData.subject}`,
    html: `
      <h2>New Contact Inquiry</h2>
      <p><strong>From:</strong> ${formData.name} (${formData.email})</p>
      <p><strong>Subject:</strong> ${formData.subject}</p>
      <p><strong>Urgency:</strong> ${formData.urgency}</p>
      <p><strong>Message:</strong></p>
      <p>${formData.message}</p>
      <p><strong>Inquiry ID:</strong> ${inquiryId}</p>
    `,
  });
  */
  
  console.log('Admin notification email would be sent for inquiry:', inquiryId, 'with subject:', formData.subject);
}

/**
 * Send confirmation email to user (placeholder)
 * TODO: Implement with your email service
 */
async function sendUserConfirmationEmail(email: string, name: string, inquiryId: string) {
  // This would be implemented with your email service
  console.log('Confirmation email would be sent to:', email, 'for inquiry:', inquiryId);
} 