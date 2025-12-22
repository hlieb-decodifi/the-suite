import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';
import { generateSEOMetadata } from '@/utils/seo';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how we collect, use, and protect your personal information and data.',
  keywords: [
    'privacy policy',
    'data protection',
    'personal information',
    'GDPR',
    'privacy',
    'data security',
  ],
  path: '/privacy-policy',
  type: 'article',
});

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage documentType="privacy_policy" />;
}
