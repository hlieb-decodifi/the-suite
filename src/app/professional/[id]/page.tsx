import { ProfessionalPublicTemplate } from '@/components/templates/ProfessionalPublicTemplate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfessionalPublicPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Await params if they're a promise
  const resolvedParams = await Promise.resolve(params);

  return <ProfessionalPublicTemplate profileId={resolvedParams.id} />;
}
