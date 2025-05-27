import { ProfessionalPageLayout } from '@/components/layouts/ProfessionalPageLayout/ProfessionalPageLayout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfessionalPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProfessionalPageLayout profileId={id}>{children}</ProfessionalPageLayout>
  );
}
