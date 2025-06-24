import { ServiceListItem, ServicesFilters } from './types';

/**
 * Filters services based on search term and location
 */
export function filterServices(services: ServiceListItem[], filters: ServicesFilters): ServiceListItem[] {
  return services.filter((service) => {
    const matchesSearch = service.name
      .toLowerCase()
      .includes(filters.searchTerm.toLowerCase());
    
    const matchesLocation = !filters.location || 
      service.professional.address
        .toLowerCase()
        .includes(filters.location.toLowerCase());
    
    return matchesSearch && matchesLocation;
  });
}

/**
 * Gets paginated services from the filtered list
 */
export function getPaginatedServices(
  filteredServices: ServiceListItem[],
  currentPage: number,
  pageSize: number
): ServiceListItem[] {
  return filteredServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
}

/**
 * Calculates the total number of pages based on filtered services and page size
 */
export function calculateTotalPages(filteredServices: ServiceListItem[], pageSize: number): number {
  return Math.ceil(filteredServices.length / pageSize);
}

/**
 * Gets services for display based on filtering state
 * If no filters applied, uses server-side paginated data
 * If only search term applied, uses client-side filtering
 * If location filtering applied, uses server results directly (since server filtering is more comprehensive)
 */
export function getServicesForDisplay(
  initialServices: ServiceListItem[],
  filteredServices: ServiceListItem[],
  filters: ServicesFilters,
  currentPage: number,
  pageSize: number
): ServiceListItem[] {
  // If location filter is applied, use server results directly
  // Server-side location filtering is more comprehensive and handles complex address matching
  if (filters.location !== '') {
    return initialServices;
  }
  
  // If no filters are applied, use the services as is (already paginated from server)
  if (filters.searchTerm === '') {
    return initialServices;
  }

  // Otherwise, apply pagination on client-side filtered results (search only)
  return getPaginatedServices(filteredServices, currentPage, pageSize);
}

/**
 * Creates a new pagination state after filters change
 */
export function createFilteredPagination(
  services: ServiceListItem[],
  filters: ServicesFilters,
  pageSize: number
): {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
} {
  const filteredServices = filterServices(services, filters);
  
  return {
    currentPage: 1,
    totalPages: calculateTotalPages(filteredServices, pageSize),
    totalItems: filteredServices.length,
    pageSize,
  };
}

/**
 * Scrolls to the specified element with an optional offset
 * Enhanced version that ensures we scroll to the very top
 */
export function scrollToElement(element: HTMLElement | null, offset = 0): void {
  if (!element) return;

  // Get the element's position relative to the viewport
  const rect = element.getBoundingClientRect();
  
  // Get the current scroll position
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Calculate the absolute position to scroll to
  // (element's position from top of page minus desired offset)
  const targetPosition = rect.top + scrollTop - offset;
  
  // Scroll with a shorter delay for more immediate response
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth',
  });
  
  // Add an additional scroll with zero delay as a fallback
  // to ensure scrolling happens reliably
  setTimeout(() => {
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  }, 10);
} 