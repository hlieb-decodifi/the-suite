'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { RefObject, useEffect, useRef, useState } from 'react';
import { fetchServicesAction } from '../../actions';
import {
  AuthStatus,
  PaginationInfo,
  ServiceListItem,
  ServicesFilters,
  SortOption,
} from '../../types';
import { ServicesTemplateListSection } from '../ServicesTemplateListSection';
import { FiltersSection } from './FiltersSection';
import {
  useFiltersHandler,
  usePageChangeHandler,
  useServicesState,
  useURLSync,
} from './hooks';
import { useUserDefaultLocation } from './useUserDefaultLocation';
import { useSearch } from '@/stores/searchStore';

type ClientServicesContainerProps = {
  initialServices: ServiceListItem[];
  initialPagination: PaginationInfo;
  initialSearchTerm?: string;
  initialLocation?: string;
  initialSortBy?: SortOption;
  authStatus: AuthStatus;
};

// Helper function to handle smooth scrolling
function smoothScrollToContainer(
  containerRef: RefObject<HTMLDivElement | null>,
  immediate = false,
) {
  if (!containerRef.current) return;

  // Determine behavior based on immediate flag
  const behavior = immediate ? 'auto' : 'smooth';

  // Use scrollIntoView
  containerRef.current.scrollIntoView({
    behavior,
    block: 'start',
  });

  // Also use window.scrollTo for maximum compatibility
  if (immediate) {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  } else {
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = rect.top + scrollTop - 80; // Apply offset

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  }
}

// Custom hook for server-side search without page reload
function useServerSearch(
  setIsLoading: (loading: boolean) => void,
  setFilters: (filters: React.SetStateAction<ServicesFilters>) => void,
  setServices: (services: ServiceListItem[]) => void,
  setPagination: (pagination: PaginationInfo) => void,
  pagination: PaginationInfo,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return async (searchTerm: string, page: number = 1, sortBy?: SortOption) => {
    try {
      // Perform an immediate scroll for better UX before loading
      smoothScrollToContainer(containerRef, true);

      setIsLoading(true);

      // Update URL without navigation
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      } else {
        params.delete('search');
      }
      params.set('page', page.toString());

      // Handle sort parameter if provided
      if (sortBy && sortBy !== 'name-asc') {
        params.set('sort', sortBy);
      } else if (sortBy === 'name-asc') {
        params.delete('sort');
      }

      // Update browser history without causing navigation
      window.history.pushState({}, '', `${pathname}?${params.toString()}`);

      // Update local filter state
      setFilters((prev) => ({
        ...prev,
        searchTerm,
        ...(sortBy && { sortBy }),
      }));

      // Fetch services from server
      const result = await fetchServicesAction(
        page,
        pagination.pageSize,
        searchTerm,
      );

      // Update services and pagination state
      setServices(result.services);
      setPagination(result.pagination);

      // Final scroll after data is loaded with a small delay to ensure DOM has updated
      setTimeout(() => {
        smoothScrollToContainer(containerRef, false);
      }, 50);
    } catch (error) {
      console.error('Error performing server search:', error);
    } finally {
      setIsLoading(false);
    }
  };
}

// Render function for main section layout
function renderLayout(
  containerRef: RefObject<HTMLDivElement | null>,
  filters: ServicesFilters,
  handleFiltersChange: (filters: ServicesFilters) => void,
  displayedServices: ServiceListItem[],
  pagination: PaginationInfo,
  handlePageChange: (page: number) => void,
  authStatus: AuthStatus,
  isLoading: boolean,
) {
  return (
    <div
      className="flex flex-col gap-4"
      ref={containerRef}
      id="services-container"
    >
      {/* Mobile filters */}
      <FiltersSection filters={filters} isMobile={true} />

      {/* Desktop view - two-column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Desktop filters */}
        <FiltersSection filters={filters} />

        {/* Services list */}
        <div className="flex-1">
          <ServicesTemplateListSection
            services={displayedServices}
            pagination={pagination}
            onPageChange={handlePageChange}
            authStatus={authStatus}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            onSortChange={(sortBy) =>
              handleFiltersChange({ ...filters, sortBy })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function ClientServicesContainer({
  initialServices,
  initialPagination,
  initialSearchTerm = '',
  initialLocation = '',
  initialSortBy = 'name-asc',
  authStatus,
}: ClientServicesContainerProps) {
  const userDefaultLocation = useUserDefaultLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const { resetSearch } = useSearch();

  const {
    displayedServices,
    pagination,
    setPagination,
    filters,
    setFilters,
    isLoading,
    services,
    setServices,
  } = useServicesState(
    initialServices,
    initialPagination,
    initialSearchTerm,
    initialLocation,
    initialSortBy,
    userDefaultLocation
  );

  // Set up server-side search without page reload
  const handleServerSearch = useServerSearch(
    setIsLoadingServices,
    setFilters,
    setServices,
    setPagination,
    pagination,
    containerRef,
  );

  useEffect(() => {
    return () => {
      resetSearch();
    };
  }, [resetSearch]);

  // Sync URL parameters with component state
  useURLSync(filters, setFilters, pagination, setPagination, containerRef);

  // Create handlers for filters and pagination
  const handleFiltersChange = useFiltersHandler(
    services,
    pagination,
    setPagination,
    setFilters,
    containerRef,
    handleServerSearch,
  );

  const handlePageChange = usePageChangeHandler(
    filters,
    pagination,
    setPagination,
    containerRef,
    handleServerSearch,
  );

  // Render the main layout
  return renderLayout(
    containerRef,
    filters,
    handleFiltersChange,
    displayedServices,
    pagination,
    handlePageChange,
    authStatus,
    isLoadingServices || isLoading,
  );
}
