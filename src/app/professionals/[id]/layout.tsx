import { ProfessionalPageLayout } from '@/components/layouts/ProfessionalPageLayout/ProfessionalPageLayout';

// Cache the page for a reasonable time since professional profiles don't change frequently
// This provides good performance while ensuring data freshness
export const revalidate = 300; // Revalidate every 5 minutes

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
