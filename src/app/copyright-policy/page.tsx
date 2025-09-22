import { LegalDocumentPage } from '@/components/pages/LegalDocumentPage/LegalDocumentPage';
import type { Metadata } from 'next';

// Use dynamic rendering instead of static generation

export const metadata: Metadata = {
  title: 'Copyright Policy',
  description:
    'Learn about our copyright policy and how to report claims of copyright infringement.',
};

export default function CopyrightPolicyPage() {
  return <LegalDocumentPage documentType="copyright_policy" />;
}
