import { Database } from '@/../supabase/types';
import { ServiceFormValues } from '@/components/forms/ServiceForm';

/**
 * Database service type from Supabase schema
 */
export type ServiceDB = Database['public']['Tables']['services']['Row'];

/**
 * UI representation of a service
 */
export type ServiceUI = {
  id: string;
  name: string;
  price: number;
  duration: string; // formatted as "2h 30m"
  description: string;
  is_archived: boolean;
  archived_at: string | null;
};

/**
 * Pagination response structure
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Parameters for service requests
 */
export type ServiceParams = {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

/**
 * Parameters for creating/updating services
 */
export type UpsertServiceParams = {
  userId: string;
  data: ServiceFormValues & { id?: string };
};

/**
 * Parameters for deleting services
 */
export type DeleteServiceParams = {
  userId: string;
  serviceId: string;
  serviceName: string; // For optimistic updates
};

export type ServiceLimitInfo = {
  currentCount: number;
  maxServices: number;
  remaining: number;
  isAtLimit: boolean;
}; 