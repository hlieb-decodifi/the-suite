import type { Metadata } from 'next';

export type SEOData = {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  imageUrl?: string;
  type?: 'website' | 'profile' | 'article';
  noIndex?: boolean;
};

/**
 * Generate consistent metadata for pages
 */
export function generateSEOMetadata({
  title,
  description,
  keywords = [],
  canonicalUrl,
  imageUrl,
  type = 'website',
  noIndex = false,
}: SEOData): Metadata {
  const siteName = 'The Suite';

  // Ensure description is within optimal length
  const metaDescription =
    description.length > 160
      ? description.substring(0, 157) + '...'
      : description;

  // Add base keywords to every page
  const allKeywords = [
    ...keywords,
    'beauty services',
    'wellness',
    'professional services',
    'appointment booking',
    'The Suite',
  ];

  return {
    title: title.includes(siteName) ? title : `${title} | ${siteName}`,
    description: metaDescription,
    keywords: allKeywords.filter(Boolean),
    ...(canonicalUrl && { alternates: { canonical: canonicalUrl } }),
    openGraph: {
      title,
      description: metaDescription,
      type,
      ...(canonicalUrl && { url: canonicalUrl }),
      siteName,
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: metaDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  };
}

/**
 * Generate SEO-friendly URL slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
  breadcrumbs: Array<{
    name: string;
    url: string;
  }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * Extract location information from address string
 */
export function parseLocation(location?: string): {
  city?: string;
  state?: string;
  country?: string;
} {
  if (!location) return {};

  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const result: { city?: string; state?: string; country?: string } = {};
    if (parts[0]) result.city = parts[0];
    if (parts[1]) result.state = parts[1];
    result.country = parts[2] || 'United States';
    return result;
  }

  if (parts.length === 1 && parts[0]) {
    return {
      city: parts[0],
      country: 'United States',
    };
  }

  return {};
}

/**
 * Generate professional-specific keywords
 */
export function generateProfessionalKeywords({
  name,
  profession,
  location,
  services = [],
}: {
  name: string;
  profession: string;
  location?: string;
  services?: string[];
}): string[] {
  const keywords = [
    name,
    profession,
    `${profession} near me`,
    `book ${profession.toLowerCase()}`,
  ];

  if (location) {
    keywords.push(
      `${profession} in ${location}`,
      `${profession} ${location}`,
      location,
    );
  }

  // Add service-related keywords
  services.forEach((service) => {
    keywords.push(
      service,
      `${service} near me`,
      location ? `${service} in ${location}` : `${service} booking`,
    );
  });

  return keywords.filter(Boolean);
}

/**
 * Format price for display in structured data
 */
export function formatPriceForSEO(price: number): string {
  return price.toFixed(2);
}

/**
 * Generate FAQ structured data for services
 */
export function generateServiceFAQStructuredData(
  faqs: Array<{
    question: string;
    answer: string;
  }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
