import { createClient } from '@/lib/supabase/server';
import { getURL } from '@/lib/utils/url';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getURL();
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/professionals`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/copyright-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic professional pages
  const { data: professionals, error } = await supabase
    .from('professional_profiles')
    .select('user_id, updated_at')
    .eq('is_published', true);

  if (error) {
    console.error('Error fetching professionals for sitemap:', error);
    return staticPages;
  }

  const professionalPages: MetadataRoute.Sitemap = (professionals || []).flatMap(
    (professional) => {
      const lastModified = new Date(professional.updated_at);
      return [
        {
          url: `${baseUrl}/professionals/${professional.user_id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        },
        {
          url: `${baseUrl}/professionals/${professional.user_id}/services`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        },
      ];
    },
  );

  return [...staticPages, ...professionalPages];
}
