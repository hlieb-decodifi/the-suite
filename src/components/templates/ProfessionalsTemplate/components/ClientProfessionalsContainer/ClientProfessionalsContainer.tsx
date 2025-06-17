'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { fetchProfessionalsAction } from '../../actions';
import { PaginationInfo, ProfessionalListItem } from '../../types';
import { ProfessionalsTemplateListSection } from '../ProfessionalsTemplateListSection/ProfessionalsTemplateListSection';

export type ClientProfessionalsContainerProps = {
  initialProfessionals: ProfessionalListItem[];
  initialPagination: PaginationInfo;
  initialSearchTerm: string;
};

export function ClientProfessionalsContainer({
  initialProfessionals,
  initialPagination,
  initialSearchTerm,
}: ClientProfessionalsContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [pagination, setPagination] = useState(initialPagination);

  // Update state when initial props change (e.g., after server-side search)
  useEffect(() => {
    setProfessionals(initialProfessionals);
    setPagination(initialPagination);
  }, [initialProfessionals, initialPagination]);

  const handlePageChange = (newPage: number) => {
    startTransition(async () => {
      // Update URL with new page
      const params = new URLSearchParams(searchParams);
      params.set('page', newPage.toString());
      router.push(`/professionals?${params.toString()}`);

      // Fetch new data
      try {
        const result = await fetchProfessionalsAction(
          newPage,
          pagination.pageSize,
          initialSearchTerm,
        );
        setProfessionals(result.professionals);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Error fetching professionals:', error);
      }
    });
  };

  return (
    <ProfessionalsTemplateListSection
      professionals={professionals}
      pagination={pagination}
      searchTerm={initialSearchTerm}
      onPageChange={handlePageChange}
      isLoading={isPending}
    />
  );
}
