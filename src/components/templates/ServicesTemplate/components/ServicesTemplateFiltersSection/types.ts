import { ServicesFilters } from '../../types';

export type ServicesTemplateFiltersSectionProps = {
  filters: ServicesFilters;
  handleServerSearch: (searchTerm: string, page?: number) => Promise<void>;
}; 