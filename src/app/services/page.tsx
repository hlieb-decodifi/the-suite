import { ServicesTemplate } from '@/components/templates/ServicesTemplate';

type SearchParams = {
  search?: string;
  location?: string;
  page?: string;
};

// Enable dynamic rendering for this page to access searchParams
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for this route

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <ServicesTemplate searchParams={searchParams} />;
}
