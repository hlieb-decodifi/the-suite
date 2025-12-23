import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';
import { generateSEOMetadata } from '@/utils/seo';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms and Conditions',
  description:
    'Read our terms and conditions to understand the rules and regulations for using our platform.',
  keywords: [
    'terms and conditions',
    'terms of service',
    'user agreement',
    'legal terms',
    'platform rules',
  ],
  path: '/terms-and-conditions',
  type: 'article',
});

export default function TermsAndConditionsPage() {
  return <LegalDocumentPage documentType="terms_and_conditions" />;
}
