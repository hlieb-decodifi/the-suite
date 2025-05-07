import { Suspense } from 'react';
import { getServices } from './actions';
import { ClientServicesContainer } from './components/ClientServicesContainer';
import { ServicesTemplateHeader } from './components/ServicesTemplateHeader';

type SearchParams = {
  page?: string;
};

export async function ServicesTemplate({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Get page from query params or default to 1
  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 12;

  // Fetch paginated services data on the server
  const { services, pagination } = await getServices(page, pageSize);

  return (
    <div className="container max-w-7xl mx-auto">
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <ServicesTemplateHeader />

        {/* Main Content Area */}
        <Suspense
          fallback={
            <div className="text-center py-10">Loading services...</div>
          }
        >
          <ClientServicesContainer
            initialServices={services}
            initialPagination={pagination}
          />
        </Suspense>
      </div>
    </div>
  );
}
