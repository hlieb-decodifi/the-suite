import { ProfileServicesPage } from '@/components/pages/ProfileServicesPage/ProfileServicesPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
