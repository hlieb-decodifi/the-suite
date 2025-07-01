import { ServiceListItem, PaginationInfo, AuthStatus, SortOption } from '../../types';

export type ServicesTemplateListSectionProps = {
  services: ServiceListItem[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  authStatus: AuthStatus;
  isLoading?: boolean;
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
}; 