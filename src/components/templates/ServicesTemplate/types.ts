// Professional information type
export type Professional = {
  id: string;
  name: string;
  avatar: string;
  address: string;
  rating: number;
  reviewCount: number;
  profile_id?: string;
  hide_full_address: boolean;
  address_data?: {
    id: string;
    country: string;
    state: string;
    city: string;
    street_address: string;
    apartment: string;
    latitude: number;
    longitude: number;
  } | null;
};
export type ServiceListItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // Duration in minutes
  professional: Professional;
  isBookable?: boolean;
};

// Auth status type to pass to service card
export type AuthStatus = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isClient: boolean;
};

// Sorting options for services
export type SortOption = 'name-asc' | 'name-desc' | 'location-asc';

export type SortConfig = {
  value: SortOption;
  label: string;
};

// Services filter types
export type ServicesFilters = {
  searchTerm: string;
  location: string;
  sortBy: SortOption;
};

// Pagination type
export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};
