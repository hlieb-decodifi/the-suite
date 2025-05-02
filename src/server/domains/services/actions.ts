'use server';

import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { revalidatePath } from 'next/cache';
import { getServicesForUser, upsertService as dbUpsertService, deleteService as dbDeleteService } from './db';
import type { Service } from './db';
import type { ServiceUI } from '@/types/services';

/**
 * Convert minutes to a formatted duration string (e.g., 90 => "1h 30m")
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return '0m'; // Default if 0 minutes
}

/**
 * Convert duration in form hours and minutes to total minutes for DB
 */
function convertToMinutes(hours?: number, minutes?: number): number {
  const h = hours ?? 0;
  const m = minutes ?? 0;
  return (h * 60) + m;
}

/**
 * Convert a database service to a UI-friendly service object
 */
function serviceToUI(service: Service): ServiceUI {
  return {
    id: service.id,
    name: service.name,
    price: service.price,
    duration: formatDuration(service.duration),
    description: service.description || '', // Ensure description is always string
  };
}

/**
 * Server Action: Get all services for a user with pagination and search
 */
export async function getServices({
  userId,
  page = 1,
  pageSize = 20,
  search = '',
}: {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  try {
    const result = await getServicesForUser({ userId, page, pageSize, search });
    
    return {
      success: true,
      services: result.services.map(serviceToUI),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      }
    };
  } catch (error) {
    console.error('Error in getServices action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch services',
    };
  }
}

/**
 * Server Action: Create or update a service
 */
export async function upsertService({
  userId,
  data,
}: {
  userId: string;
  data: ServiceFormValues & { id?: string };
}) {
  try {
    // Check if duration is valid
    const durationMinutes = convertToMinutes(
      data.durationHours,
      data.durationMinutes
    );
    
    if (durationMinutes <= 0) {
      return { success: false, error: 'Duration must be greater than 0 minutes.' };
    }
    
    // Create base service data without id
    const baseServiceData = {
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      duration: durationMinutes,
    };
    
    // Add id if it exists
    const serviceData = data.id 
      ? { ...baseServiceData, id: data.id }
      : baseServiceData;
    
    const result = await dbUpsertService({ userId, serviceData });
    
    // Revalidate the path to show updated data
    revalidatePath('/profile');
    
    return { success: true, service: serviceToUI(result) };
  } catch (error) {
    console.error('Error in upsertService action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save service',
    };
  }
}

/**
 * Server Action: Delete a service
 */
export async function deleteService({
  userId,
  serviceId,
}: {
  userId: string;
  serviceId: string;
}) {
  try {
    await dbDeleteService({ userId, serviceId });
    
    // Revalidate the path to show updated data
    revalidatePath('/profile');
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteService action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete service',
    };
  }
} 