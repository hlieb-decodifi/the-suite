import { ProfilePage } from '@/components/pages/ProfilePage/ProfilePage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfessionalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfilePage userId={id} isEditable={false} />;
}
