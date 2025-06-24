// Professional information type
export type Professional = {
  id: string;
  name: string;
  avatar?: string | undefined;
  address: string;
  rating: number;
  reviewCount: number;
  profile_id: string; // Database profile ID for use with APIs
  hide_full_address: boolean;
  address_data: {
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

// Service type with related professional information
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

// Services filter types
export type ServicesFilters = {
  searchTerm: string;
  location: string;
};

// Pagination type
export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}; 