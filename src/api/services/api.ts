import {
  getServices as getServicesAction,
  upsertService as upsertServiceAction,
  deleteService as deleteServiceAction,
} from '@/server/domains/services/actions';
import type {
  ServiceUI,
  ServiceParams,
  UpsertServiceParams,
  DeleteServiceParams,
  PaginatedResponse,
} from '@/types/services';

/**
 * Get services for a user with pagination and search support
 */
export async function getServices({
  userId,
  page = 1,
  pageSize = 20,
  search = '',
}: ServiceParams): Promise<ServiceUI[]> {
  const result = await getServicesAction({ userId, page, pageSize, search });

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch services');
  }

  return result.services ?? [];
}

/**
 * Get services with pagination information
 */
export async function getServicesWithPagination({
  userId,
  page = 1,
  pageSize = 20,
  search = '',
}: ServiceParams): Promise<PaginatedResponse<ServiceUI>> {
  const result = await getServicesAction({ userId, page, pageSize, search });

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch services');
  }

  if (!result.services || !result.pagination) {
    throw new Error('Server returned invalid data format');
  }

  return {
    data: result.services,
    pagination: result.pagination,
  };
}

/**
 * Create or update a service
 */
export async function upsertService({
  userId,
  data,
}: UpsertServiceParams): Promise<ServiceUI> {
  const result = await upsertServiceAction({ userId, data });

  if (!result.success || !result.service) {
    throw new Error(result.error || 'Failed to save service');
  }

  return result.service;
}

/**
 * Delete a service
 */
export async function deleteService({
  userId,
  serviceId,
}: Omit<DeleteServiceParams, 'serviceName'>): Promise<void> {
  const result = await deleteServiceAction({ userId, serviceId });

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete service');
  }
}
