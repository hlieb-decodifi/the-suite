import { ProfileServicesPage } from '@/components/pages/ProfileServicesPage/ProfileServicesPage';

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <ProfileServicesPage searchParams={searchParams} />;
}
