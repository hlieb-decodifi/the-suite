'use server';

import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { revalidatePath } from 'next/cache';
import { getServicesForUser, upsertService as dbUpsertService, deleteService as dbDeleteService } from './db';
import type { Service } from './db';
import type { ServiceUI } from '@/types/services';
import { formatDuration } from '@/utils/formatDuration';
import { createClient } from '@/lib/supabase/server';

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

/**
 * Get service limit information for a professional
 */
export async function getServiceLimitInfo({ userId }: { userId: string }) {
  const supabase = await createClient();

  try {
    // Get professional profile and its max_services if set
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, max_services')
      .eq('user_id', userId)
      .single();

    if (profileError || !professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found',
      };
    }

    // Get current service count
    const { count: currentCount, error: countError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('professional_profile_id', professionalProfile.id);

    if (countError) {
      return {
        success: false,
        error: 'Failed to get service count',
      };
    }

    // 1. Try professional_profiles.max_services
    let maxServices = professionalProfile.max_services;

    // 2. If not set, try service_limits table
    if (maxServices == null) {
      const { data: limitData } = await supabase
        .from('service_limits')
        .select('max_services')
        .eq('professional_profile_id', professionalProfile.id)
        .single();
      if (limitData?.max_services != null) {
        maxServices = limitData.max_services;
      }
    }

    // 3. If still not set, try admin_configs table
    if (maxServices == null) {
      const { data: adminConfig } = await supabase
        .from('admin_configs')
        .select('value')
        .eq('key', 'max_services_default')
        .single();
      if (adminConfig?.value != null) {
        const parsed = parseInt(adminConfig.value, 10);
        if (!isNaN(parsed)) {
          maxServices = parsed;
        }
      }
    }

    // 4. Fallback to 50
    if (maxServices == null) {
      maxServices = 50;
    }

    const currentCountNum = currentCount || 0;
    const remaining = Math.max(0, maxServices - currentCountNum);
    const isAtLimit = currentCountNum >= maxServices;

    return {
      success: true,
      data: {
        currentCount: currentCountNum,
        maxServices,
        remaining,
        isAtLimit,
      },
    };
  } catch (error) {
    console.error('Error getting service limit info:', error);
    return {
      success: false,
      error: 'Failed to get service limit information',
    };
  }
} 