import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';

// Use static generation with revalidation instead of dynamic rendering
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Read our terms and conditions to understand the rules and regulations for using our platform.',
};

export default function TermsAndConditionsPage() {
  return <LegalDocumentPage documentType="terms_and_conditions" />;
}
