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