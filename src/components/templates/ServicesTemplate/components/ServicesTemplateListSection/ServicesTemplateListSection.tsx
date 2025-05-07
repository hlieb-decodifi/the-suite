'use client';

import { Typography } from '@/components/ui/typography';
import { ServicesTemplateListSectionProps } from './types';
import { ServicesTemplateServicesList } from './components/ServicesTemplateServicesList/ServicesTemplateServicesList';
import { ServicesTemplateEmptyState } from './components/ServicesTemplateEmptyState/ServicesTemplateEmptyState';
import { ServicesTemplatePagination } from './components/ServicesTemplatePagination';
import { Loader2 } from 'lucide-react';

export function ServicesTemplateListSection({
  services,
  pagination,
  onPageChange,
  authStatus,
  isLoading = false,
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
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading services...
            </span>
          ) : totalItems > 0 ? (
            `Showing ${start}-${end} of ${totalItems} services`
          ) : (
            'No services found'
          )}
        </Typography>
      </div>

      {/* Services list or empty state */}
      {isLoading && services.length === 0 ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : services.length > 0 ? (
        <div className={isLoading ? 'opacity-60 pointer-events-none' : ''}>
          <ServicesTemplateServicesList
            services={services}
            authStatus={authStatus}
          />
        </div>
      ) : (
        <ServicesTemplateEmptyState />
      )}

      {/* Pagination controls */}
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
