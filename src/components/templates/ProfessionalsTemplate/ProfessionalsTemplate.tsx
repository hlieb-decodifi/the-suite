import { Suspense } from 'react';
import { getProfessionals } from './actions';
import { ClientProfessionalsContainer } from './components/ClientProfessionalsContainer/ClientProfessionalsContainer';
import { ProfessionalsTemplateHeader } from './components/ProfessionalsTemplateHeader/ProfessionalsTemplateHeader';

type SearchParams = {
  page?: string;
  q?: string;
};

export async function ProfessionalsTemplate({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Get page from query params or default to 1
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page, 10)
    : 1;
  const searchTerm = resolvedSearchParams?.q || '';
  const pageSize = 12;

  // Fetch paginated professionals data on the server with search filter
  const { professionals, pagination } = await getProfessionals(
    page,
    pageSize,
    searchTerm,
  );

  return (
    <div className="w-full mx-auto">
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <ProfessionalsTemplateHeader searchTerm={searchTerm} />

        {/* Main Content Area */}
        <Suspense
          fallback={
            <div className="text-center py-10">Loading professionals...</div>
          }
        >
          <ClientProfessionalsContainer
            initialProfessionals={professionals}
            initialPagination={pagination}
            initialSearchTerm={searchTerm}
          />
        </Suspense>
      </div>
    </div>
  );
}
