'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  contactFormSchema,
  type ContactFormData,
} from '@/components/forms/ContactForm/schema';

// Subject options mapping - must match the options in ContactFormContent.tsx
const subjectOptions = [
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'billing_payment', label: 'Billing/Payment Issues' },
  { value: 'account_problems', label: 'Account Problems' },
  { value: 'professional_application', label: 'Professional Application' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'complaint_feedback', label: 'Complaint/Feedback' },
  { value: 'other', label: 'Other' },
];

/**
 * Get subject label from value
 */
function getSubjectLabel(value: string): string {
  const option = subjectOptions.find((opt) => opt.value === value);
  return option ? option.label : value; // Fallback to value if not found
}

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
    // Check authentication - only authenticated users can submit inquiries
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Please sign in to submit a contact inquiry.',
      };
    }

    // Check if user has exceeded daily limit (10 inquiries per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo);

    if (countError) {
      console.error('Error checking inquiry count:', countError);
    } else if (count !== null && count >= 10) {
      return {
        success: false,
        error:
          'You have reached the maximum number of inquiries allowed per day (10). Please try again tomorrow.',
      };
    }

    // Validate form data
    const validatedData = contactFormSchema.parse(formData);

    // Additional server-side validation for security
    if (validatedData.message.length > 5000) {
      return {
        success: false,
        error: 'Message is too long. Please keep it under 5000 characters.',
      };
    }

    if (validatedData.name.length > 200) {
      return {
        success: false,
        error: 'Name is too long. Please keep it under 200 characters.',
      };
    }

    if (validatedData.subject.length > 500) {
      return {
        success: false,
        error: 'Subject is too long. Please keep it under 500 characters.',
      };
    }

    // Prepare inquiry data
    const inquiryData = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      subject: validatedData.subject,
      message: validatedData.message,
      urgency: 'medium' as const, // Default urgency since it's not in the form anymore
      user_id: user.id, // Now required - user is always authenticated
    };

    // Insert inquiry into database (RLS will allow authenticated users)
    const { data: inquiry, error } = await supabase
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

    // Send email notification to admins
    await sendAdminNotificationEmail(inquiry.id, validatedData);

    // Send confirmation email to user
    await sendUserConfirmationEmail(
      validatedData.email,
      validatedData.name,
      inquiry.id,
      validatedData,
    );

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
  offset: number = 0,
) {
  try {
    // Check if current user is admin
    const { requireAdminUser } = await import('@/server/domains/admin/actions');
    const adminCheck = await requireAdminUser();
    if (!adminCheck.success) {
      return {
        success: false,
        error: 'Admin access required',
        inquiries: [],
      };
    }

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('contact_inquiries')
      .select(
        `
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
      `,
      )
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
      error:
        error instanceof Error ? error.message : 'Failed to fetch inquiries',
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
  adminNotes?: string,
) {
  try {
    // Check if current user is admin
    const { requireAdminUser } = await import('@/server/domains/admin/actions');
    const adminCheck = await requireAdminUser();
    if (!adminCheck.success) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    const supabase = await createClient();

    // Get current user for assigned_to field
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Failed to get user information',
      };
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
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update inquiry status',
    };
  }
}

/**
 * Send email notification to admins
 */
async function sendAdminNotificationEmail(
  inquiryId: string,
  formData: ContactFormData,
) {
  try {
    const { sendContactInquiryAdmin } = await import(
      '@/providers/brevo/templates'
    );

    // Get subject label from value
    const subjectLabel = getSubjectLabel(formData.subject);

    const result = await sendContactInquiryAdmin(
      [{ email: process.env.BREVO_ADMIN_EMAIL!, name: 'Admin Team' }],
      {
        email: formData.email,
        full_name: formData.name,
        message: formData.message,
        phone: formData.phone,
        topic: subjectLabel,
      },
    );

    if (!result.success) {
      console.error('Failed to send admin notification email:', result.error);
    } else {
      console.log(
        'Admin notification email sent successfully:',
        result.messageId,
      );
    }

    return result;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send confirmation email to user
 */
async function sendUserConfirmationEmail(
  email: string,
  fullName: string,
  inquiryId: string,
  formData: ContactFormData,
) {
  try {
    const { sendContactInquiryConfirmation } = await import(
      '@/providers/brevo/templates'
    );

    // Split full name to get first name
    const firstName = fullName.split(' ')[0] || fullName;

    // Get subject label from value
    const subjectLabel = getSubjectLabel(formData.subject);

    const result = await sendContactInquiryConfirmation(
      [{ email, name: fullName }],
      {
        email,
        first_name: firstName,
        full_name: fullName,
        message: formData.message,
        phone: formData.phone,
        topic: subjectLabel,
      },
    );

    if (!result.success) {
      console.error('Failed to send user confirmation email:', result.error);
    } else {
      console.log(
        'User confirmation email sent successfully:',
        result.messageId,
      );
    }

    return result;
  } catch (error) {
    console.error('Error sending user confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
