import { ProfilePortfolioPage } from '@/components/pages/ProfilePortfolioPage/ProfilePortfolioPage';

// Cache the page for a short time since portfolio data can change
export const revalidate = 30; // Revalidate every 30 seconds

export default function PortfolioPage() {
  return <ProfilePortfolioPage />;
}
