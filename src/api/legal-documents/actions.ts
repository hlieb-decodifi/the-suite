import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getLegalDocument(
  type: 'terms' | 'privacy' | 'copyright',
) {
  const supabase = await createClient();
  const docType =
    type === 'terms'
      ? 'terms_and_conditions'
      : type === 'privacy'
        ? 'privacy_policy'
        : 'copyright_policy';
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('type', docType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function updateLegalDocument(
  type: 'terms' | 'privacy' | 'copyright',
  content: string,
  effectiveDate: string,
) {
  // Check if current user is admin
  const { requireAdminUser } = await import('@/server/domains/admin/actions');
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    console.error('Unauthorized attempt to update legal document');
    return false;
  }

  const supabase = await createClient();
  const docType =
    type === 'terms'
      ? 'terms_and_conditions'
      : type === 'privacy'
        ? 'privacy_policy'
        : 'copyright_policy';

  // Convert empty string to null for effective_date
  const effectiveDateValue = effectiveDate.trim() === '' ? null : effectiveDate;

  // First, try to update existing document
  const { data: updateData, error: updateError } = await supabase
    .from('legal_documents')
    .update({
      content,
      effective_date: effectiveDateValue,
      is_published: true,
      title:
        docType === 'terms_and_conditions'
          ? 'Terms & Conditions'
          : docType === 'privacy_policy'
            ? 'Privacy Policy'
            : 'Copyright Policy',
    })
    .eq('type', docType)
    .eq('is_published', true)
    .select();

  let error = updateError;

  // If no rows were updated (document doesn't exist), create a new one
  if (!updateError && (!updateData || updateData.length === 0)) {
    const { error: insertError } = await supabase
      .from('legal_documents')
      .insert({
        type: docType,
        content,
        effective_date: effectiveDateValue,
        is_published: true,
        title:
          docType === 'terms_and_conditions'
            ? 'Terms & Conditions'
            : docType === 'privacy_policy'
              ? 'Privacy Policy'
              : 'Copyright Policy',
      });
    error = insertError;
  }

  // Revalidate the admin legal page and any public legal pages
  if (!error) {
    revalidatePath('/admin/legal');
    revalidatePath('/terms-and-conditions');
    revalidatePath('/privacy-policy');
    revalidatePath('/copyright-policy');
  }

  return !error;
}
