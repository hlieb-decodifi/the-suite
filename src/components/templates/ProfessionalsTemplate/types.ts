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