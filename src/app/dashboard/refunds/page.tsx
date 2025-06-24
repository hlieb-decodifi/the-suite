import { DashboardRefundsPage } from '@/components/pages/DashboardRefundsPage/DashboardRefundsPage';

type SearchParams = {
  start_date?: string;
  end_date?: string;
};

// Enable dynamic rendering for searchParams
export const dynamic = 'force-dynamic';

// Enable caching for 1 minute
export const revalidate = 60;

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardRefundsPage
      startDate={resolvedSearchParams.start_date}
      endDate={resolvedSearchParams.end_date}
    />
  );
}
