import { ServiceListItem, PaginationInfo, AuthStatus } from '../../types';

export type ServicesTemplateListSectionProps = {
  services: ServiceListItem[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  authStatus: AuthStatus;
  isLoading?: boolean;
}; 