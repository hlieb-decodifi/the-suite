import Script from 'next/script';

export type ProfessionalStructuredDataProps = {
  professionalName: string;
  profession: string;
  description?: string;
  location?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  contactInfo?: {
    phone?: string;
    website?: string;
  };
  services?: Array<{
    name: string;
    description?: string;
    price?: number;
  }>;
  averageRating?: number;
  reviewCount?: number;
  profileUrl: string;
  imageUrl?: string;
};

export function ProfessionalStructuredData({
  professionalName,
  profession,
  description,
  location,
  address,
  contactInfo,
  services = [],
  averageRating,
  reviewCount,
  profileUrl,
  imageUrl,
}: ProfessionalStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: professionalName,
    jobTitle: profession,
    description: description,
    url: profileUrl,
    ...(imageUrl && { image: imageUrl }),
    ...(location && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: address?.city || location,
        addressRegion: address?.state,
        addressCountry: address?.country || 'US',
        ...(address?.street && { streetAddress: address.street }),
      },
    }),
    ...(contactInfo?.phone && {
      telephone: contactInfo.phone,
    }),
    ...(services.length > 0 && {
      makesOffer: services.map((service) => ({
        '@type': 'Offer',
        name: service.name,
        description: service.description,
        ...(service.price && {
          price: service.price,
          priceCurrency: 'USD',
        }),
      })),
    }),
    ...(averageRating &&
      reviewCount && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: averageRating,
          reviewCount: reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    sameAs: [profileUrl],
  };

  // Also create LocalBusiness schema if we have location data
  const localBusinessData = location
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: `${professionalName} - ${profession}`,
        description: description,
        url: profileUrl,
        ...(imageUrl && { image: imageUrl }),
        address: {
          '@type': 'PostalAddress',
          addressLocality: address?.city || location,
          addressRegion: address?.state,
          addressCountry: address?.country || 'US',
          ...(address?.street && { streetAddress: address.street }),
        },
        ...(contactInfo?.phone && {
          telephone: contactInfo.phone,
        }),
        ...(averageRating &&
          reviewCount && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: averageRating,
              reviewCount: reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }),
        serviceType: profession,
        ...(services.length > 0 && {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Services',
            itemListElement: services.map((service, index) => ({
              '@type': 'Offer',
              name: service.name,
              description: service.description,
              ...(service.price && {
                price: service.price,
                priceCurrency: 'USD',
              }),
              position: index + 1,
            })),
          },
        }),
      }
    : null;

  return (
    <>
      <Script
        id="professional-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      {localBusinessData && (
        <Script
          id="local-business-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessData),
          }}
        />
      )}
    </>
  );
}
