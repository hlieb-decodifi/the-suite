import { DashboardRefundsPage } from '@/components/pages/DashboardRefundsPage/DashboardRefundsPage';

// Enable caching for 1 minute
export const revalidate = 60;

export default function RefundsPage() {
  return <DashboardRefundsPage />;
}
