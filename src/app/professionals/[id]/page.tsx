import { ProfilePage } from '@/components/pages/ProfilePage/ProfilePage';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { generateSEOMetadata, generateProfessionalKeywords } from '@/utils/seo';

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
  const title = `${professionalName} - ${profession}${location ? ` in ${location}` : ''}`;
  const metaDescription = description
    ? description
    : `Book ${profession.toLowerCase()} services with ${professionalName}${location ? ` in ${location}` : ''}. Professional beauty and wellness services on The Suite platform.`;

  // Generate professional-specific keywords
  const keywords = generateProfessionalKeywords({
    name: professionalName,
    profession,
    location,
  });

  return generateSEOMetadata({
    title,
    description: metaDescription,
    keywords,
    path: `/professionals/${id}`,
    type: 'profile',
  });
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
