/**
 * Admin: Fetch the latest version of a legal document (for editing)
 */
export async function getLegalDocumentAdminAction(
  type: 'terms_and_conditions' | 'privacy_policy'
): Promise<LegalDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('type', type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    type: data.type as 'terms_and_conditions' | 'privacy_policy',
    title: data.title,
    content: data.content,
    version: data.version,
    isPublished: data.is_published,
    effectiveDate: data.effective_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Admin: Save a new version of a legal document
 */
export async function updateLegalDocumentAdminAction(
  type: 'terms_and_conditions' | 'privacy_policy',
  content: string,
  effectiveDate: string
): Promise<boolean> {
  const supabase = await createClient();
  // Insert new version (do not overwrite)
  const { error } = await supabase
    .from('legal_documents')
    .insert({
      type,
      content,
      effective_date: effectiveDate,
      is_published: true,
      title: type === 'terms_and_conditions' ? 'Terms & Conditions' : 'Privacy Policy',
    });
  return !error;
}

import { createClient } from '@/lib/supabase/server';
import { createClient as createPublicClient } from '@supabase/supabase-js';
import type { Tables } from '@/../supabase/types';

export type LegalDocument = {
  id: string;
  type: 'terms_and_conditions' | 'privacy_policy';
  title: string;
  content: string;
  version: number;
  isPublished: boolean;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
};

// Use the generated type from Supabase
type LegalDocumentRow = Tables<'legal_documents'>;

/**
 * Server Action: Fetch a published legal document by type
 * Uses public client to avoid cookies during static generation
 */
export async function getLegalDocumentAction(
  type: 'terms_and_conditions' | 'privacy_policy'
): Promise<{
  success: boolean;
  document?: LegalDocument;
  error?: string;
}> {
  try {
    // Use public client for static generation - no authentication needed for legal documents
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createPublicClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('type', type)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('Error fetching legal document:', error);
      return { 
        success: false, 
        error: 'Document not found' 
      };
    }

    if (!data) {
      return { 
        success: false, 
        error: 'Document not found' 
      };
    }

    const document: LegalDocument = {
      id: data.id,
      type: data.type as 'terms_and_conditions' | 'privacy_policy',
      title: data.title,
      content: data.content,
      version: data.version,
      isPublished: data.is_published,
      effectiveDate: data.effective_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, document };
  } catch (error) {
    console.error('Error in getLegalDocumentAction:', error);
    return { 
      success: false, 
      error: 'Failed to fetch document' 
    };
  }
}

/**
 * Server Action: Get all versions of a legal document type (for admin use)
 */
export async function getLegalDocumentVersionsAction(
  type: 'terms_and_conditions' | 'privacy_policy'
): Promise<{
  success: boolean;
  documents?: LegalDocument[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('type', type)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching legal document versions:', error);
      return { 
        success: false, 
        error: 'Failed to fetch document versions' 
      };
    }

    const documents: LegalDocument[] = (data || []).map((row: LegalDocumentRow) => ({
      id: row.id,
      type: row.type as 'terms_and_conditions' | 'privacy_policy',
      title: row.title,
      content: row.content,
      version: row.version,
      isPublished: row.is_published,
      effectiveDate: row.effective_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, documents };
  } catch (error) {
    console.error('Error in getLegalDocumentVersionsAction:', error);
    return { 
      success: false, 
      error: 'Failed to fetch document versions' 
    };
  }
} 