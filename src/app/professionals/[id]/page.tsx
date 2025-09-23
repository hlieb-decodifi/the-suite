import { ProfilePage } from '@/components/pages/ProfilePage/ProfilePage';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

// Cache the page for a reasonable time since professional profiles don't change frequently
// This provides good performance while ensuring data freshness
export const revalidate = 300; // Revalidate every 5 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      title: 'Professional Not Found',
      description: 'The requested professional profile could not be found.',
    };
  }

  const supabase = await createClient();

  // Fetch professional profile data for SEO
  const { data: profile } = await supabase
    .from('professional_profiles')
    .select(
      `
      *,
      users!inner(
        first_name,
        last_name
      )
    `,
    )
    .eq('user_id', id)
    .eq('is_published', true)
    .single();

  if (!profile) {
    return {
      title: 'Professional Not Found',
      description: 'The requested professional profile could not be found.',
    };
  }

  const professionalName = `${profile.users.first_name} ${profile.users.last_name}`;
  const profession = profile.profession || 'Professional';
  const location = profile.location || '';
  const description = profile.description || '';

  // Create SEO-optimized title and description
  const title = `${professionalName} - ${profession}${location ? ` in ${location}` : ''} | The Suite`;
  const metaDescription = description
    ? description.substring(0, 160)
    : `Book ${profession.toLowerCase()} services with ${professionalName}${location ? ` in ${location}` : ''}. Professional beauty and wellness services on The Suite platform.`;

  return {
    title,
    description: metaDescription,
    keywords: [
      professionalName,
      profession,
      location,
      'beauty services',
      'wellness',
      'professional services',
      'book appointment',
      'The Suite',
    ].filter(Boolean),
    openGraph: {
      title,
      description: metaDescription,
      type: 'profile',
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/professionals/${id}`,
      siteName: 'The Suite',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProfessionalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate UUID format to prevent processing invalid IDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  return <ProfilePage userId={id} isEditable={false} />;
}
