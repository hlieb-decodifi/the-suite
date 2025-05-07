import { ServicesFilters } from '../../types';

export type ServicesTemplateFiltersSectionProps = {
  filters: ServicesFilters;
  onFiltersChange: (filters: ServicesFilters) => void;
}; 