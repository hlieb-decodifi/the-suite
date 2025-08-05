import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function getLegalDocument(type: 'terms' | 'privacy') {
  const supabase = await createClient();
  const docType = type === 'terms' ? 'terms_and_conditions' : 'privacy_policy';
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

export async function updateLegalDocument(type: 'terms' | 'privacy', content: string, effectiveDate: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Server configuration error: missing Supabase URL or Service Role Key');
  }
  const adminSupabase = createAdminClient(supabaseUrl, supabaseServiceKey);
  const docType = type === 'terms' ? 'terms_and_conditions' : 'privacy_policy';
  const { error } = await adminSupabase
    .from('legal_documents')
    .update({
      content,
      effective_date: effectiveDate,
      is_published: true,
      title: docType === 'terms_and_conditions' ? 'Terms & Conditions' : 'Privacy Policy',
    })
    .eq('type', docType);
  return !error;
}
