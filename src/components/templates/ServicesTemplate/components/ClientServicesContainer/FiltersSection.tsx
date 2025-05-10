import { ServicesFilters } from '../../types';
import { ServicesTemplateFiltersSection } from '../ServicesTemplateFiltersSection';

type FiltersSectionProps = {
  filters: ServicesFilters;
  isMobile?: boolean;
  handleServerSearch: (searchTerm: string, page?: number) => Promise<void>;
};

/**
 * Renders filters section for both mobile and desktop views
 */
export function FiltersSection({
  filters,
  isMobile = false,
  handleServerSearch,
}: FiltersSectionProps) {
  if (isMobile) {
    return (
      <div className="md:hidden mb-2">
        <ServicesTemplateFiltersSection
          filters={filters}
          handleServerSearch={handleServerSearch}
        />
      </div>
    );
  }

  return (
    <div className="hidden md:block md:w-72 flex-shrink-0">
      <div className="sticky top-24">
        <ServicesTemplateFiltersSection
          filters={filters}
          handleServerSearch={handleServerSearch}
        />
      </div>
    </div>
  );
}
