import AdminLegalPageClient from './AdminLegalPageClient';
import { getLegalDocument } from '@/api/legal-documents/actions';
import type { LegalDoc } from '@/types/legal_documents';

// Server action for updating legal documents
import { updateLegalDocument as updateLegalDocumentBase } from '@/api/legal-documents/actions';

// This is the server action wrapper
async function updateLegalDocument(
  type: 'terms' | 'privacy' | 'copyright',
  content: string,
  effectiveDate: string,
) {
  'use server';
  return updateLegalDocumentBase(type, content, effectiveDate);
}

export default async function AdminLegalPage() {
  // Fetch all legal documents on the server
  const [terms, privacy, copyright] = await Promise.all([
    getLegalDocument('terms'),
    getLegalDocument('privacy'),
    getLegalDocument('copyright'),
  ]);

  console.log('terms', terms);
  console.log('privacy', privacy);
  console.log('copyright', copyright);

  // Always provide a fallback LegalDoc object
  const fallback: LegalDoc = {
    content: '',
    effectiveDate: '',
  };
  const initialTerms: LegalDoc = terms
    ? {
        content: terms.content,
        effectiveDate: terms.effective_date || fallback.effectiveDate,
      }
    : fallback;
  const initialPrivacy: LegalDoc = privacy
    ? {
        content: privacy.content,
        effectiveDate: privacy.effective_date || fallback.effectiveDate,
      }
    : fallback;
  const initialCopyright: LegalDoc = copyright
    ? {
        content: copyright.content,
        effectiveDate: copyright.effective_date || fallback.effectiveDate,
      }
    : fallback;

  return (
    <AdminLegalPageClient
      initialTerms={initialTerms}
      initialPrivacy={initialPrivacy}
      initialCopyright={initialCopyright}
      updateLegalDocument={updateLegalDocument}
    />
  );
}
