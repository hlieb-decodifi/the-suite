import { ProfileServicesPage } from '@/components/pages/ProfileServicesPage/ProfileServicesPage';

// Cache the page for a short time since services data can change
export const revalidate = 30; // Revalidate every 30 seconds

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <ProfileServicesPage searchParams={searchParams} />;
}
