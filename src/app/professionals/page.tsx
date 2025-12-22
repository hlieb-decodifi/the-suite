/* eslint-disable @typescript-eslint/no-unused-vars */
import { ProfessionalsTemplate } from '@/components/templates/ProfessionalsTemplate';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { generateSEOMetadata } from '@/utils/seo';

type SearchParams = {
  q?: string;
  page?: string;
};

// Enable dynamic rendering for this page to access searchParams
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for this route

export const metadata: Metadata = generateSEOMetadata({
  title: 'Professional Directory | Find Skilled Beauty & Wellness Experts',
  description:
    'Browse our curated network of skilled professionals ready to provide exceptional beauty and wellness services. From hair stylists to wellness specialists, find the perfect professional for your needs.',
  keywords: [
    'professionals',
    'beauty experts',
    'wellness specialists',
    'hair stylists',
    'makeup artists',
    'spa professionals',
    'massage therapists',
    'directory',
    'find professionals',
    'book professionals',
  ],
  path: '/professionals',
  type: 'website',
});

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  redirect('/');
  // return <ProfessionalsTemplate searchParams={searchParams} />;
}
