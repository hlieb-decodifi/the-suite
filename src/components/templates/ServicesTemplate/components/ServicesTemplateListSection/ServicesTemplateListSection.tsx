'use client';

import { Typography } from '@/components/ui/typography';
import { ServicesTemplateListSectionProps } from './types';
import { ServicesTemplateServicesList } from './components/ServicesTemplateServicesList/ServicesTemplateServicesList';
import { ServicesTemplateEmptyState } from './components/ServicesTemplateEmptyState/ServicesTemplateEmptyState';
import { ServicesTemplatePagination } from './components/ServicesTemplatePagination';

export function ServicesTemplateListSection({
  services,
  pagination,
  onPageChange,
  authStatus,
}: ServicesTemplateListSectionProps) {
  const { currentPage, totalPages, totalItems, pageSize } = pagination;

  // Calculate showing range (e.g., "Showing 1-10 of 25 services")
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="space-y-4">
      {/* Results summary */}
      <div className="flex justify-between items-center">
        <Typography className="text-muted-foreground">
          {totalItems > 0
            ? `Showing ${start}-${end} of ${totalItems} services`
            : 'No services found'}
        </Typography>
      </div>

      {/* Services list or empty state */}
      {services.length > 0 ? (
        <ServicesTemplateServicesList
          services={services}
          authStatus={authStatus}
        />
      ) : (
        <ServicesTemplateEmptyState />
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <ServicesTemplatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
