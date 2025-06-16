import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';

// Cache the page for a longer time since legal documents don't change frequently
export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how we collect, use, and protect your personal information and data.',
};

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage documentType="privacy_policy" />;
}
