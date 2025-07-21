import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how we collect, use, and protect your personal information and data.',
};

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage documentType="privacy_policy" />;
}
