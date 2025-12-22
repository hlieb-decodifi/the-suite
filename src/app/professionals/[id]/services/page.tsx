import { ProfileServicesPage } from '@/components/pages/ProfileServicesPage/ProfileServicesPage';
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
      title: 'Services Not Found',
      description: 'The requested professional services could not be found.',
    };
  }

  const supabase = await createClient();

  // Fetch professional profile and services data for SEO
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
      title: 'Services Not Found',
      description: 'The requested professional services could not be found.',
    };
  }

  // Fetch services for this professional
  const { data: services } = await supabase
    .from('services')
    .select('name, description, price')
    .eq('professional_profile_id', profile.id)
    .eq('is_archived', false)
    .order('name');

  const professionalName = `${profile.users.first_name} ${profile.users.last_name}`;
  const profession = profile.profession || 'Professional';
  const location = profile.location || '';

  // Create service names list for SEO
  const serviceNames =
    services?.map((s) => s.name).join(', ') || 'various services';

  const title = `${professionalName} Services - ${profession}${location ? ` in ${location}` : ''}`;
  const metaDescription = `Book ${serviceNames.toLowerCase()} with ${professionalName}${location ? ` in ${location}` : ''}. ${services?.length || 0} professional services available for booking.`;

  // Generate professional-specific keywords including services
  const keywords = generateProfessionalKeywords({
    name: professionalName,
    profession,
    location,
    services: services?.map((s) => s.name) || [],
  });

  return generateSEOMetadata({
    title,
    description: metaDescription,
    keywords: [...keywords, 'services', 'booking', 'appointment'],
    path: `/professionals/${id}/services`,
    type: 'website',
  });
}

export default async function ProfessionalPublicServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  return (
    <ProfileServicesPage
      userId={id}
      isEditable={false}
      searchParams={searchParams || Promise.resolve({})}
    />
  );
}
