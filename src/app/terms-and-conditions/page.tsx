import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Read our terms and conditions to understand the rules and regulations for using our platform.',
};

export default function TermsAndConditionsPage() {
  return <LegalDocumentPage documentType="terms_and_conditions" />;
}
