import { ProfessionalPublicTemplate } from '@/components/templates/ProfessionalPublicTemplate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfessionalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfessionalPublicTemplate profileId={id} />;
}
