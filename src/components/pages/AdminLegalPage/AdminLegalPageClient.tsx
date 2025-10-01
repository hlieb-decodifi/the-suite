'use client';

import AdminLegalTemplate from '@/components/templates/AdminLegalTemplate/AdminLegalTemplate';
import type { LegalDoc } from '@/types/legal_documents';
import { useTransition } from 'react';

export default function AdminLegalPageClient({
  initialTerms,
  initialPrivacy,
  initialCopyright,
  updateLegalDocument,
}: {
  initialTerms: LegalDoc;
  initialPrivacy: LegalDoc;
  initialCopyright: LegalDoc;
  updateLegalDocument: (
    type: 'terms' | 'privacy' | 'copyright',
    content: string,
    effectiveDate: string,
  ) => Promise<boolean>;
}) {
  // Wrap the server action for use in the client
  const [, startTransition] = useTransition();

  const updateLegalDocumentClient = async (
    type: 'terms' | 'privacy' | 'copyright',
    content: string,
    effectiveDate: string,
  ) => {
    let result = false;
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        result = await updateLegalDocument(type, content, effectiveDate);
        resolve();
      });
    });
    return result;
  };

  return (
    <AdminLegalTemplate
      initialTerms={initialTerms}
      initialPrivacy={initialPrivacy}
      initialCopyright={initialCopyright}
      updateLegalDocument={updateLegalDocumentClient}
    />
  );
}
