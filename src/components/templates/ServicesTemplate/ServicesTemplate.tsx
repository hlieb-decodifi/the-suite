import { Suspense } from 'react';
import { getServices } from './actions';
import { ClientServicesContainer } from './components/ClientServicesContainer';
import { ServicesTemplateHeader } from './components/ServicesTemplateHeader';

type SearchParams = {
  page?: string;
  search?: string;
  location?: string;
};

export async function ServicesTemplate({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Get page from query params or default to 1
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page, 10)
    : 1;
  const searchTerm = resolvedSearchParams?.search || '';
  const location = resolvedSearchParams?.location || '';
  const pageSize = 12;

  // Fetch paginated services data on the server with search and location filters
  const { services, pagination } = await getServices(
    page,
    pageSize,
    searchTerm,
    location,
  );

  return (
    <div className="max-w-7xl w-full mx-auto">
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <ServicesTemplateHeader searchTerm={searchTerm} location={location} />

        {/* Main Content Area */}
        <Suspense
          fallback={
            <div className="text-center py-10">Loading services...</div>
          }
        >
          <ClientServicesContainer
            initialServices={services}
            initialPagination={pagination}
            initialSearchTerm={searchTerm}
            initialLocation={location}
          />
        </Suspense>
      </div>
    </div>
  );
}
