'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  showPageNumbers?: boolean;
  maxPageButtons?: number;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  showPageNumbers = true,
  maxPageButtons = 7,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    if (totalPages <= maxPageButtons) {
      // Show all pages if total is less than max
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    // Always show first page
    pages.push(1);

    if (shouldShowLeftDots) {
      pages.push('...');
    } else if (leftSiblingIndex === 2) {
      pages.push(2);
    }

    // Show pages around current page
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (shouldShowRightDots) {
      pages.push('...');
    } else if (rightSiblingIndex === totalPages - 1) {
      pages.push(totalPages - 1);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousPage}
        disabled={currentPage === 1 || disabled}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            typeof page === 'number' ? (
              <Button
                key={index}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                className={cn('w-9 h-9', page === currentPage && 'pointer-events-none')}
              >
                {page}
              </Button>
            ) : (
              <span
                key={index}
                className="flex items-center justify-center w-9 h-9 text-muted-foreground"
              >
                {page}
              </span>
            ),
          )}
        </div>
      )}

      {!showPageNumbers && (
        <div className="text-sm text-muted-foreground px-3">
          Page {currentPage} of {totalPages}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextPage}
        disabled={currentPage === totalPages || disabled}
        className="flex items-center gap-1"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

