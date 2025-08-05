import { DashboardSupportRequestsPage } from '@/components/pages/DashboardSupportRequestsPage/DashboardSupportRequestsPage';

type SearchParams = {
  start_date?: string;
  end_date?: string;
  status?: string;
  category?: string;
};

// Enable dynamic rendering for searchParams
export const dynamic = 'force-dynamic';

// Enable caching for 1 minute
export const revalidate = 60;

export default async function SupportRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardSupportRequestsPage
      startDate={resolvedSearchParams.start_date}
      endDate={resolvedSearchParams.end_date}
      status={resolvedSearchParams.status}
      category={resolvedSearchParams.category}
    />
  );
}
