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

// Custom hook for scrolling to an element
function useScrollToElement() {
  const scrollToElement = useCallback(
    (element: HTMLElement | null, offset = 0) => {
      if (!element) return;

      // Get the element's position relative to the viewport
      const rect = element.getBoundingClientRect();

      // Calculate the absolute position to scroll to
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const targetPosition = rect.top + scrollTop - offset;

      // Perform the scroll
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    },
    [],
  );

  return scrollToElement;
}

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
  const scrollToElement = useScrollToElement();

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

          // Scroll to top after new services are loaded
          setTimeout(() => {
            scrollToElement(containerRef.current, 80);
          }, 100);
        } catch (error) {
          console.error('Error fetching services:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPagedServices();
    }
  }, [searchParams, filters, pagination.currentPage, scrollToElement]);

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

      // Scroll to top when filters change
      setTimeout(() => {
        scrollToElement(containerRef.current, 80);
      }, 100);
    },
    [
      services,
      pagination.pageSize,
      router,
      pathname,
      searchParams,
      scrollToElement,
    ],
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

        // Scroll to top after state update with a small delay to ensure state has updated
        setTimeout(() => {
          scrollToElement(containerRef.current, 80); // Add offset for header
        }, 100);
      } else {
        // Otherwise, update URL with the new page (triggers the useEffect)
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());

        // Use shallow routing to avoid full page refresh
        router.push(`${pathname}?${params.toString()}`, { scroll: false });

        // Scroll to top after navigation
        setTimeout(() => {
          scrollToElement(containerRef.current, 80); // Add offset for header
        }, 100);
      }
    },
    [filters, router, pathname, searchParams, scrollToElement],
  );

  return (
    <div
      className="flex flex-col gap-4"
      ref={containerRef}
      id="services-container"
    >
      {/* Mobile view - filters above services */}
      <div className="md:hidden mb-2">
        <ServicesTemplateFiltersSection
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Desktop view - two-column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar - filters (desktop only) */}
        <div className="hidden md:block md:w-72 flex-shrink-0">
          <div className="sticky top-24">
            <ServicesTemplateFiltersSection
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>

        {/* Right content - services list */}
        <div className="flex-1">
          <ServicesTemplateListSection
            services={displayedServices}
            pagination={pagination}
            onPageChange={handlePageChange}
            authStatus={authStatus}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
