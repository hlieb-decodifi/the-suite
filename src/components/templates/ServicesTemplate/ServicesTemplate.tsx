import { Suspense } from 'react';
import { getServices } from './actions';
import { ClientServicesContainer } from './components/ClientServicesContainer';
import { ServicesTemplateHeader } from './components/ServicesTemplateHeader';

type SearchParams = {
  page?: string;
  search?: string;
};

export async function ServicesTemplate({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Get page from query params or default to 1
  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const searchTerm = searchParams?.search || '';
  const pageSize = 12;

  // Fetch paginated services data on the server with search filter
  const { services, pagination } = await getServices(
    page,
    pageSize,
    searchTerm,
  );

  return (
    <div className="max-w-7xl w-full mx-auto">
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <ServicesTemplateHeader searchTerm={searchTerm} />

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
          />
        </Suspense>
      </div>
    </div>
  );
}
