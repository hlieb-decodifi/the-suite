import { ProfilePortfolioPage } from '@/components/pages/ProfilePortfolioPage/ProfilePortfolioPage';

// Cache the page for a reasonable time since professional profiles don't change frequently
// This provides good performance while ensuring data freshness
export const revalidate = 300; // Revalidate every 5 minutes

export default async function ProfessionalPublicPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfilePortfolioPage userId={id} isEditable={false} />;
}
