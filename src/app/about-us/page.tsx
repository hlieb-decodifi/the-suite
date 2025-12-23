import { AboutUsTemplate } from '@/components/templates/AboutUsTemplate';
import type { Metadata } from 'next';
import { generateSEOMetadata } from '@/utils/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'About Us',
  description:
    'Learn about The Suite - connecting clients with exceptional beauty and wellness professionals. Discover our mission, values, and story.',
  keywords: [
    'about us',
    'our story',
    'mission',
    'values',
    'beauty platform',
    'wellness platform',
  ],
  path: '/about-us',
  type: 'website',
});

export default function AboutUsPage() {
  return <AboutUsTemplate />;
}
