// Professional information type for the professionals listing
export type ProfessionalListItem = {
  id: string;
  user_id: string;
  name: string;
  avatar?: string | undefined;
  profession?: string | undefined;
  description?: string | undefined;
  location?: string | undefined;
  rating: number;
  reviewCount: number;
  serviceCount: number;
  isSubscribed: boolean;
  joinedDate: string;
  hide_full_address: boolean;
  address: {
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

// Pagination type
export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

// Professionals filter types
export type ProfessionalsFilters = {
  searchTerm: string;
  location: string;
}; 