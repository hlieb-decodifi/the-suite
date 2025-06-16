import { ProfileServicesPage } from '@/components/pages/ProfileServicesPage/ProfileServicesPage';

// Cache the page for a reasonable time since professional profiles don't change frequently
// This provides good performance while ensuring data freshness
export const revalidate = 300; // Revalidate every 5 minutes

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
