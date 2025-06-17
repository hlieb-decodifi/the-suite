import { Typography } from '@/components/ui/typography';
import { PaginationInfo, ProfessionalListItem } from '../../types';
import { ServicesTemplatePagination } from '../../../ServicesTemplate/components/ServicesTemplateListSection/components/ServicesTemplatePagination/ServicesTemplatePagination';
import { ProfessionalsTemplateEmptyState } from './components/ProfessionalsTemplateEmptyState/ProfessionalsTemplateEmptyState';
import { ProfessionalsTemplateProfessionalsList } from './components/ProfessionalsTemplateProfessionalsList/ProfessionalsTemplateProfessionalsList';

export type ProfessionalsTemplateListSectionProps = {
  professionals: ProfessionalListItem[];
  pagination: PaginationInfo;
  searchTerm?: string;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function ProfessionalsTemplateListSection({
  professionals,
  pagination,
  searchTerm,
  onPageChange,
  isLoading = false,
}: ProfessionalsTemplateListSectionProps) {
  const { currentPage, totalPages, totalItems } = pagination;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-10">
          <Typography variant="p" className="text-muted-foreground">
            Loading professionals...
          </Typography>
        </div>
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="space-y-8">
        <ProfessionalsTemplateEmptyState searchTerm={searchTerm} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <Typography variant="p" className="text-muted-foreground">
          {searchTerm
            ? `Found ${totalItems} professional${totalItems !== 1 ? 's' : ''} for "${searchTerm}"`
            : `Showing ${totalItems} professional${totalItems !== 1 ? 's' : ''}`}
        </Typography>
      </div>

      {/* Professionals grid */}
      <ProfessionalsTemplateProfessionalsList professionals={professionals} />

      {/* Pagination */}
      {totalPages > 1 && (
        <ServicesTemplatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
