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

/**
 * Sorts services based on the selected sort option, including distance-based sorting for location-asc.
 * @param services List of services
 * @param sortBy Sort option
 * @param userLocation Optional user location { latitude, longitude }
 */
export function sortServices(
  services: ServiceListItem[],
  sortBy: SortOption,
  userLocation?: { latitude: number; longitude: number } | null
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
      // If no user location, fallback to alphabetical by city
      if (!userLocation) {
        result = sortedServices.sort((a, b) => {
          const locationA = a.professional.address_data?.city || a.professional.address || '';
          const locationB = b.professional.address_data?.city || b.professional.address || '';
          const cityComparison = locationA.localeCompare(locationB);
          if (cityComparison !== 0) {
            return cityComparison;
          }
          return a.name.localeCompare(b.name);
        });
      } else {
        // Sort by distance to user location
        result = sortedServices.sort((a, b) => {
          const distA = getDistanceFromUser(userLocation, a.professional.address_data || undefined);
          const distB = getDistanceFromUser(userLocation, b.professional.address_data || undefined);
          if (distA === distB) {
            return a.name.localeCompare(b.name);
          }
          return distA - distB;
        });
      }
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
 * Calculates the distance (in meters) between the user and a service's address using the Haversine formula.
 * Returns Infinity if address_data is missing or invalid.
 */
function getDistanceFromUser(
  userLoc: { latitude: number; longitude: number },
  addressData?: { latitude?: number; longitude?: number }
): number {
  if (!addressData?.latitude || !addressData?.longitude) return Infinity;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // meters
  const φ1 = toRad(userLoc.latitude);
  const φ2 = toRad(addressData.latitude!);
  const Δφ = toRad(addressData.latitude! - userLoc.latitude);
  const Δλ = toRad(addressData.longitude! - userLoc.longitude);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  pageSize: number,
  userLocation?: { latitude: number; longitude: number } | null
): ServiceListItem[] {
  // If location filter is applied, use server results directly
  // Server-side location filtering is more comprehensive and handles complex address matching
  if (filters.location !== '') {
    return initialServices;
  }
  
  // If no filters are applied, use the services as is (already paginated from server)
  if (filters.searchTerm === '') {
    // Always apply the selected sort to the initial results
    return sortServices(initialServices, filters.sortBy, userLocation);
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