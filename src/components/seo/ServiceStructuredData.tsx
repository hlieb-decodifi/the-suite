import Script from 'next/script';

export type ServiceStructuredDataProps = {
  serviceName: string;
  description?: string;
  price?: number;
  duration?: number; // in minutes
  category?: string;
  provider: {
    name: string;
    profession: string;
    location?: string;
    profileUrl: string;
    averageRating?: number;
    reviewCount?: number;
  };
  serviceUrl: string;
  imageUrl?: string;
};

export function ServiceStructuredData({
  serviceName,
  description,
  price,
  duration,
  category,
  provider,
  serviceUrl,
  imageUrl,
}: ServiceStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description: description,
    url: serviceUrl,
    ...(imageUrl && { image: imageUrl }),
    ...(category && { category: category }),
    ...(duration && {
      duration: `PT${duration}M`, // ISO 8601 duration format
    }),
    offers: {
      '@type': 'Offer',
      name: serviceName,
      description: description,
      ...(price && {
        price: price,
        priceCurrency: 'USD',
      }),
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString().split('T')[0], // Today's date
    },
    provider: {
      '@type': 'Person',
      name: provider.name,
      jobTitle: provider.profession,
      url: provider.profileUrl,
      ...(provider.location && {
        address: {
          '@type': 'PostalAddress',
          addressLocality: provider.location,
        },
      }),
      ...(provider.averageRating &&
        provider.reviewCount && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: provider.averageRating,
            reviewCount: provider.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }),
    },
    serviceType: category || provider.profession,
    areaServed: provider.location || 'United States',
  };

  return (
    <Script
      id="service-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}
