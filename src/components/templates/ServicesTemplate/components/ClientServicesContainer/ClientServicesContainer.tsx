'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ServicesTemplateFiltersSection } from '../ServicesTemplateFiltersSection';
import { ServicesTemplateListSection } from '../ServicesTemplateListSection';
import {
  ServicesFilters,
  PaginationInfo,
  ServiceListItem,
  AuthStatus,
} from '../../types';
import {
  filterServices,
  getPaginatedServices,
  calculateTotalPages,
} from '../../utils';
import { useAuthStore } from '@/stores/authStore';

type ClientServicesContainerProps = {
  initialServices: ServiceListItem[];
};

// Custom hook for auth status
function useAuthStatus(): AuthStatus {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    isClient: false,
  });

  useEffect(() => {
    setAuthStatus({
      isAuthenticated,
      isLoading,
      isClient: isAuthenticated && user?.user_metadata?.role === 'client',
    });
  }, [isAuthenticated, isLoading, user]);

  return authStatus;
}

// Custom hook for pagination and filtering logic
function useServicePagination(initialServices: ServiceListItem[]) {
  // State for filters
  const [filters, setFilters] = useState<ServicesFilters>({
    searchTerm: '',
    location: '',
  });

  // State for pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: Math.ceil(initialServices.length / 10),
    totalItems: initialServices.length,
    pageSize: 12,
  });

  // Filter services based on search and location
  const filteredServices = useMemo(
    () => filterServices(initialServices, filters),
    [initialServices, filters],
  );

  // Get paginated services
  const paginatedServices = useMemo(
    () =>
      getPaginatedServices(
        filteredServices,
        pagination.currentPage,
        pagination.pageSize,
      ),
    [filteredServices, pagination.currentPage, pagination.pageSize],
  );

  // Update filters and reset pagination
  const handleFiltersChange = useCallback(
    (newFilters: ServicesFilters) => {
      setFilters(newFilters);

      // Calculate new filtered services
      const newFilteredServices = filterServices(initialServices, newFilters);

      // Reset to first page
      setPagination((prev) => ({
        currentPage: 1,
        totalPages: calculateTotalPages(newFilteredServices, prev.pageSize),
        totalItems: newFilteredServices.length,
        pageSize: prev.pageSize,
      }));
    },
    [initialServices],
  );

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
    }));

    // Scroll to top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  return {
    filters,
    pagination,
    paginatedServices,
    handleFiltersChange,
    handlePageChange,
  };
}

export function ClientServicesContainer({
  initialServices,
}: ClientServicesContainerProps) {
  // Get auth status using the custom hook
  const authStatus = useAuthStatus();

  // Get pagination and filter related data and handlers
  const {
    filters,
    pagination,
    paginatedServices,
    handleFiltersChange,
    handlePageChange,
  } = useServicePagination(initialServices);

  return (
    <>
      <ServicesTemplateFiltersSection
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <ServicesTemplateListSection
        services={paginatedServices}
        pagination={pagination}
        onPageChange={handlePageChange}
        authStatus={authStatus}
      />
    </>
  );
}
