'use server';

import { createClient } from '@/lib/supabase/server';
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
 */
export async function getLegalDocumentAction(
  type: 'terms_and_conditions' | 'privacy_policy'
): Promise<{
  success: boolean;
  document?: LegalDocument;
  error?: string;
}> {
  try {
    const supabase = await createClient();

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