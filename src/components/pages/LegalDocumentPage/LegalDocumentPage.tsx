'use server';

import { getLegalDocumentAction } from '@/server/domains/legal-documents/actions';
import { notFound } from 'next/navigation';
import { LegalDocumentPageClient } from './LegalDocumentPageClient';

export type LegalDocumentPageProps = {
  documentType: 'terms_and_conditions' | 'privacy_policy' | 'copyright_policy';
};

export async function LegalDocumentPage({
  documentType,
}: LegalDocumentPageProps) {
  // Fetch the legal document
  const result = await getLegalDocumentAction(documentType);

  if (!result.success || !result.document) {
    notFound();
  }

  return <LegalDocumentPageClient document={result.document} />;
}
