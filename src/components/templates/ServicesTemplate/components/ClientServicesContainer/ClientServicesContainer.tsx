'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ServicesTemplateFiltersSection } from '../ServicesTemplateFiltersSection';
import { ServicesTemplateListSection } from '../ServicesTemplateListSection';
import {
  ServicesFilters,
  PaginationInfo,
  ServiceListItem,
  AuthStatus,
} from '../../types';
import {
  filterServices,
  getPaginatedServices,
  calculateTotalPages,
} from '../../utils';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getServices } from '../../actions';

type ClientServicesContainerProps = {
  initialServices: ServiceListItem[];
  initialPagination: PaginationInfo;
};

// Custom hook for auth status
function useAuthStatus(): AuthStatus {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    isClient: false,
  });

  useEffect(() => {
    setAuthStatus({
      isAuthenticated,
      isLoading,
      isClient: isAuthenticated && user?.user_metadata?.role === 'client',
    });
  }, [isAuthenticated, isLoading, user]);

  return authStatus;
}

// Helper function for determining if filtered results should use server or client pagination
function getServicesForCurrentView(
  initialServices: ServiceListItem[],
  filteredServices: ServiceListItem[],
  filters: ServicesFilters,
  pagination: PaginationInfo,
): ServiceListItem[] {
  // If no filters are applied, use the services as is (already paginated from server)
  if (filters.searchTerm === '' && filters.location === '') {
    return initialServices;
  }

  // Otherwise, apply pagination on client-side filtered results
  return getPaginatedServices(
    filteredServices,
    pagination.currentPage,
    pagination.pageSize,
  );
}

// Helper function to create pagination state when filters change
function createFilteredPagination(
  initialServices: ServiceListItem[],
  newFilters: ServicesFilters,
  pageSize: number,
): PaginationInfo {
  const newFilteredServices = filterServices(initialServices, newFilters);

  return {
    currentPage: 1,
    totalPages: calculateTotalPages(newFilteredServices, pageSize),
    totalItems: newFilteredServices.length,
    pageSize,
  };
}

/* eslint-disable max-lines-per-function */
export function ClientServicesContainer({
  initialServices,
  initialPagination,
}: ClientServicesContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  // State for services and pagination
  const [services, setServices] = useState<ServiceListItem[]>(initialServices);
  const [pagination, setPagination] =
    useState<PaginationInfo>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<ServicesFilters>({
    searchTerm: '',
    location: '',
  });

  // Get auth status using the custom hook
  const authStatus = useAuthStatus();

  // Get filtered services
  const filteredServices = useMemo(
    () => filterServices(services, filters),
    [services, filters],
  );

  // Get services to display
  const displayedServices = useMemo(
    () =>
      getServicesForCurrentView(
        services,
        filteredServices,
        filters,
        pagination,
      ),
    [filteredServices, services, filters, pagination],
  );

  // Effect to load services when page changes in URL
  useEffect(() => {
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page') as string, 10)
      : 1;

    // Only fetch if we're not filtering and the page differs from current page
    if (
      filters.searchTerm === '' &&
      filters.location === '' &&
      page !== pagination.currentPage
    ) {
      const fetchPagedServices = async () => {
        setIsLoading(true);
        try {
          const { services: newServices, pagination: newPagination } =
            await getServices(page);
          setServices(newServices);
          setPagination(newPagination);
        } catch (error) {
          console.error('Error fetching services:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPagedServices();
    }
  }, [searchParams, filters, pagination.currentPage]);

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: ServicesFilters) => {
      setFilters(newFilters);

      if (newFilters.searchTerm === '' && newFilters.location === '') {
        // If filters are cleared, reset to the initial page's data
        // and update URL to remove page param
        if (searchParams.has('page')) {
          router.push(pathname);
        }
      } else {
        // Otherwise calculate new pagination for filtered results
        const newPagination = createFilteredPagination(
          services,
          newFilters,
          pagination.pageSize,
        );
        setPagination(newPagination);
      }
    },
    [services, pagination.pageSize, router, pathname, searchParams],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      // If client-side filtering is active, just update pagination state
      if (filters.searchTerm !== '' || filters.location !== '') {
        setPagination((prev) => ({
          ...prev,
          currentPage: page,
        }));
      } else {
        // Otherwise, update URL with the new page (triggers the useEffect)
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());

        // Use shallow routing to avoid full page refresh
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
      containerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
    [filters, router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      <ServicesTemplateFiltersSection
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <ServicesTemplateListSection
        services={displayedServices}
        pagination={pagination}
        onPageChange={handlePageChange}
        authStatus={authStatus}
        isLoading={isLoading}
      />
    </div>
  );
}
