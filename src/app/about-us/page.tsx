import { AboutUsTemplate } from '@/components/templates/AboutUsTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | The Suite',
  description:
    'Learn about The Suite - connecting clients with exceptional beauty and wellness professionals. Discover our mission, values, and story.',
};

export default function AboutUsPage() {
  return <AboutUsTemplate />;
}
