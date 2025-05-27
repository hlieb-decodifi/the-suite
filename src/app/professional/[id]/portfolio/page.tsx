import { ProfilePortfolioPage } from '@/components/pages/ProfilePortfolioPage/ProfilePortfolioPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfessionalPublicPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfilePortfolioPage userId={id} isEditable={false} />;
}
