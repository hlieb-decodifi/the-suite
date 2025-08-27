import { useState, useEffect, useMemo, useCallback, RefObject } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  ServicesFilters, 
  PaginationInfo, 
  ServiceListItem, 
  SortOption
} from '../../types';
import {
  filterServices,
  sortServices,
  getServicesForDisplay,
  createFilteredPagination,
} from '../../utils';

/**
 * Utility function to handle smooth scrolling
 * Moved from ClientServicesContainer for reuse
 */
function smoothScrollToContainer(containerRef: RefObject<HTMLDivElement | null>, immediate = false) {
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
      behavior: 'auto'
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

/**
 * Hook to manage service data, filtering, and pagination
 */
export function useServicesState(
  initialServices: ServiceListItem[],
  initialPagination: PaginationInfo,
  initialSearchTerm: string,
  initialLocation: string = '',
  initialSortBy: SortOption = 'name-asc',
  userDefaultLocation?: { latitude: number; longitude: number } | null
) {
  const [services, setServices] = useState<ServiceListItem[]>(initialServices);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isLoading] = useState(false);
  const [filters, setFilters] = useState<ServicesFilters>({
    searchTerm: initialSearchTerm,
    location: initialLocation,
    sortBy: initialSortBy,
  });

  // Get filtered and sorted services
  const filteredServices = useMemo(
    () => {
      const filtered = filterServices(services, filters);
      // Pass userDefaultLocation only if location filter is empty
      const locationArg = !filters.location ? userDefaultLocation : undefined;
      return sortServices(filtered, filters.sortBy, locationArg);
    },
    [services, filters, userDefaultLocation],
  );

  // Get services to display
  const displayedServices = useMemo(
    () => {
      const locationArg = !filters.location ? userDefaultLocation : undefined;
      return getServicesForDisplay(
        initialServices,
        filteredServices,
        filters,
        pagination.currentPage,
        pagination.pageSize,
        locationArg
      );
    },
    [initialServices, filteredServices, filters, pagination, userDefaultLocation]
  );

  return {
    services,
    setServices,
    filteredServices,
    displayedServices,
    pagination,
    setPagination,
    filters,
    setFilters,
    isLoading,
  };
}

/**
 * Hook to sync component state with URL parameters
 */
export function useURLSync(
  filters: ServicesFilters,
  setFilters: (filters: ServicesFilters) => void,
  pagination: PaginationInfo,
  setPagination: (pagination: PaginationInfo) => void,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page') as string, 10)
      : 1;
    const searchParam = searchParams.get('search') || '';
    const locationParam = searchParams.get('location') || '';
    const sortParam = (searchParams.get('sort') as SortOption) || 'name-asc';

    // Update filters if search param, location param, or sort param changes
    if (
      searchParam !== filters.searchTerm || 
      locationParam !== filters.location ||
      sortParam !== filters.sortBy
    ) {
      setFilters({ 
        ...filters, 
        searchTerm: searchParam,
        location: locationParam,
        sortBy: sortParam,
      });
    }

    // Update pagination if page changes
    if (page !== pagination.currentPage) {
      setPagination({
        ...pagination,
        currentPage: page,
      });

      // Scroll to top after page change
      setTimeout(() => {
        smoothScrollToContainer(containerRef, false);
      }, 50);
    }
  }, [
    searchParams,
    filters,
    setFilters,
    pagination,
    setPagination,
    containerRef,
  ]);
}

/**
 * Hook to handle filter changes and update URL
 */
export function useFiltersHandler(
  services: ServiceListItem[],
  pagination: PaginationInfo,
  setPagination: (pagination: PaginationInfo) => void,
  setFilters: (filters: ServicesFilters) => void,
  containerRef: RefObject<HTMLDivElement | null>,
  serverSearch: (searchTerm: string, page?: number, sortBy?: SortOption) => Promise<void>
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (newFilters: ServicesFilters) => {
      // Update local filters state first
      setFilters(newFilters);

      // If we're on the services page, use server search to avoid full page reload
      if (pathname === '/services') {
        // Immediate scroll for better UX
        smoothScrollToContainer(containerRef, true);
        
        // Perform server search
        serverSearch(newFilters.searchTerm.trim(), 1, newFilters.sortBy);
        return;
      }

      // Otherwise use the normal URL update approach
  const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

      // Handle search term
      if (newFilters.searchTerm.trim()) {
        params.set('search', newFilters.searchTerm.trim());
      } else {
        params.delete('search');
      }

      // Handle location (if implemented in the future)
      if (newFilters.location) {
        params.set('location', newFilters.location);
      } else {
        params.delete('location');
      }

      // Handle sort parameter
      if (newFilters.sortBy && newFilters.sortBy !== 'name-asc') {
        params.set('sort', newFilters.sortBy);
      } else {
        params.delete('sort');
      }

      // Always reset to page 1 when filters change
      params.set('page', '1');

      // Use direct URL navigation to avoid issues with async searchParams
      window.location.href = `${pathname}?${params.toString()}`;

      // For client-side filtering, also update pagination
      if (newFilters.searchTerm !== '' || newFilters.location !== '') {
        const newPagination = createFilteredPagination(
          services,
          newFilters,
          pagination.pageSize
        );
        setPagination(newPagination);
      }

      // Scroll to top when filters change
      setTimeout(() => {
        smoothScrollToContainer(containerRef, false);
      }, 50);
    },
    [
      services,
      pagination.pageSize,
      pathname,
      searchParams,
      containerRef,
      setFilters,
      setPagination,
      serverSearch,
    ],
  );
}

/**
 * Hook to handle pagination changes
 */
export function usePageChangeHandler(
  filters: ServicesFilters,
  pagination: PaginationInfo,
  setPagination: (pagination: PaginationInfo) => void,
  containerRef: RefObject<HTMLDivElement | null>,
  serverSearch: (searchTerm: string, page?: number, sortBy?: SortOption) => Promise<void>
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    async (page: number) => {
      // If we're on the services page, use server search to perform
      // server-side pagination without a page reload
      if (pathname === '/services') {
        // First scroll to top immediately for better UX
        smoothScrollToContainer(containerRef, true);
        
        // Then perform the server search
        await serverSearch(filters.searchTerm, page, filters.sortBy);
        
        // Final scroll after data is loaded to ensure we're at the top
        setTimeout(() => {
          smoothScrollToContainer(containerRef, false);
        }, 50);
        
        return;
      }

      // If client-side filtering is active, just update pagination state
      if (filters.searchTerm !== '' || filters.location !== '') {
        setPagination({
          ...pagination,
          currentPage: page,
        });
        
        // Immediate scroll for client-side pagination
        smoothScrollToContainer(containerRef, true);
        
        // Backup scroll for reliability
        setTimeout(() => {
          smoothScrollToContainer(containerRef, false);
        }, 50);
      } else {
  // Otherwise, update URL with the new page
  const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
  params.set('page', page.toString());
        
  // Use direct URL navigation to avoid issues with async searchParams
  window.location.href = `${pathname}?${params.toString()}`;
        
  // No need to scroll here as the page will reload
      }
    },
    [
      filters,
      pagination,
      setPagination,
      pathname,
      searchParams,
      containerRef,
      serverSearch,
    ],
  );
} 