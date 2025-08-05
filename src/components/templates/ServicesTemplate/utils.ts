import { ServiceListItem, ServicesFilters } from './types';
import type { SortOption } from './types';

/**
 * Filters services based on search term
 */
export function filterServices(
  services: ServiceListItem[],
  filters: ServicesFilters,
): ServiceListItem[] {
  return services.filter((service) => {
    // Filter by search term if provided
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const nameMatch = service.name.toLowerCase().includes(searchLower);
      const descriptionMatch = service.description
      .toLowerCase()
        .includes(searchLower);
      const professionalMatch = service.professional.name
        .toLowerCase()
        .includes(searchLower);

      if (!nameMatch && !descriptionMatch && !professionalMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts services based on the selected sort option
 */
export function sortServices(
  services: ServiceListItem[],
  sortBy: SortOption,
): ServiceListItem[] {
  const sortedServices = [...services];
  
  let result: ServiceListItem[];
  switch (sortBy) {
    case 'name-asc':
      result = sortedServices.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      result = sortedServices.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'location-asc': {
      // First, sort by city and name as before
      result = sortedServices.sort((a, b) => {
        const locationA = a.professional.address_data?.city || a.professional.address || '';
        const locationB = b.professional.address_data?.city || b.professional.address || '';
        const cityComparison = locationA.localeCompare(locationB);
        if (cityComparison !== 0) {
          return cityComparison;
        }
        // If cities are the same, sort by service name
        return a.name.localeCompare(b.name);
      });
      break;
    }
    default:
      result = sortedServices;
      break;
  }

  // Final sort: subscribed professionals first, then those with addresses
  return result.sort((a, b) => {
    const aSubscribed = !!a.professional.is_subscribed;
    const bSubscribed = !!b.professional.is_subscribed;
    if (aSubscribed !== bSubscribed) return aSubscribed ? -1 : 1;

    const aHasAddress = !!a.professional.address_data;
    const bHasAddress = !!b.professional.address_data;
    if (aHasAddress === bHasAddress) return 0;
    return aHasAddress ? -1 : 1;
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
 * Calculates pagination information for filtered services
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
  };
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
    // Always apply the selected sort to the initial results
    return sortServices(initialServices, filters.sortBy);
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
    totalPages: Math.ceil(filteredServices.length / pageSize),
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