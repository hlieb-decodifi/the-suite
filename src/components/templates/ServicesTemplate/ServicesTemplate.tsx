import { Suspense } from 'react';
import { getServices } from './actions';
import { ClientServicesContainer } from './components/ClientServicesContainer';
import { ServicesTemplateHeader } from './components/ServicesTemplateHeader';
import { SortOption } from './types';
import { createClient } from '@/lib/supabase/server';
import { AuthStatus } from './types';

type SearchParams = {
  page?: string;
  search?: string;
  location?: string;
  sort?: string;
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
  const sortBy = (resolvedSearchParams?.sort as SortOption) || 'name-asc';
  const pageSize = 12;

  // Fetch paginated services data on the server with search and location filters
  const { services, pagination } = await getServices(
    page,
    pageSize,
    searchTerm,
    location,
  );

  // Get auth status from server
  const authStatus = await getAuthStatus();

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
            initialSortBy={sortBy}
            authStatus={authStatus}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Get authentication status from server
async function getAuthStatus(): Promise<AuthStatus> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return {
      isAuthenticated: false,
      isLoading: false,
      isClient: false,
    };
  }

  // Use the RPC function is_client to determine if the user is a client
  const { data: isClient } = await supabase.rpc('is_client', {
    user_uuid: user.id,
  });

  return {
    isAuthenticated: true,
    isLoading: false,
    isClient: !!isClient, // Convert to boolean with double negation
  };
}
