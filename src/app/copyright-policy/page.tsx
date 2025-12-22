import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';
import { generateSEOMetadata } from '@/utils/seo';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = generateSEOMetadata({
  title: 'Copyright Policy',
  description:
    'Learn about our copyright policy and how to report claims of copyright infringement.',
  keywords: [
    'copyright policy',
    'DMCA',
    'copyright infringement',
    'intellectual property',
    'content policy',
  ],
  path: '/copyright-policy',
  type: 'article',
});

export default function CopyrightPolicyPage() {
  return <LegalDocumentPage documentType="copyright_policy" />;
}
