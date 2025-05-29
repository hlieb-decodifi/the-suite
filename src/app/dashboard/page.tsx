import { DashboardPage } from '@/components/pages/DashboardPage/DashboardPage';

// Enable caching for 1 minute
export const revalidate = 60;

export default function DashboardOverviewPage() {
  return <DashboardPage />;
}
