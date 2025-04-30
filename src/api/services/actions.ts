'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { Database } from '@/../supabase/types';

// Type alias for easier access to Service Row type
export type Service = Database['public']['Tables']['services']['Row'];

// Type for the service as it's used in the UI (with formatted duration)
export type ServiceUI = {
  id: string;
  name: string;
  price: number;
  duration: string; // formatted as "2h 30m"
  description: string;
};

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
 * Convert a database service (Row) to a UI-friendly service object
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
 * Helper to get the professional profile ID for the currently authenticated user
 */
async function getProfessionalProfileId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching professional profile ID:', error);
    throw new Error('Could not find professional profile for the user.');
  }
  if (!data) {
    throw new Error('Professional profile not found for the user.');
  }
  return data.id;
}

/**
 * Server Action: Fetch all services for the logged-in professional
 */
export async function getServicesAction(userId: string) {
  const supabase = await createClient();
  try {
    const profileId = await getProfessionalProfileId(userId);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services:', error);
      return { success: false, error: error.message };
    }

    const servicesUI = data.map(serviceToUI);
    return { success: true, services: servicesUI };

  } catch (error) {
    console.error('Server error fetching services:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch services';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Create or Update a service for the logged-in professional
 */
export async function upsertServiceAction(
  userId: string,
  serviceData: ServiceFormValues & { id?: string }
) {
  const supabase = await createClient();
  try {
    const profileId = await getProfessionalProfileId(userId);
    const durationMinutes = convertToMinutes(
      serviceData.durationHours,
      serviceData.durationMinutes
    );

    // Ensure duration is valid
    if (durationMinutes <= 0) {
        return { success: false, error: 'Duration must be greater than 0 minutes.' };
    }

    const serviceRecord = {
      name: serviceData.name,
      description: serviceData.description || null,
      price: serviceData.price,
      duration: durationMinutes,
      professional_profile_id: profileId,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (serviceData.id) {
      // Update existing service
      result = await supabase
        .from('services')
        .update(serviceRecord)
        .eq('id', serviceData.id)
        .eq('professional_profile_id', profileId) // Ensure ownership
        .select()
        .single();
    } else {
      // Create new service
      result = await supabase
        .from('services')
        .insert({ 
            ...serviceRecord,
            created_at: new Date().toISOString(), // Set created_at only for new records
         })
        .select()
        .single();
    }

    if (result.error) {
      // Check for specific constraint errors (like service limit)
      if (result.error.message.includes('Maximum of 10 services allowed')) {
        return { success: false, error: 'You have reached the maximum limit of 10 services.' };
      }
      console.error('Error upserting service:', result.error);
      return { success: false, error: result.error.message };
    }

    // Revalidate the path to show updated data
    revalidatePath('/profile');

    return { success: true, service: serviceToUI(result.data as Service) };

  } catch (error) {
    console.error('Server error upserting service:', error);
    const message = error instanceof Error ? error.message : 'Failed to save service';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Delete a service for the logged-in professional
 */
export async function deleteServiceAction(userId: string, serviceId: string) {
  const supabase = await createClient();
  try {
    const profileId = await getProfessionalProfileId(userId);
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('professional_profile_id', profileId); // Ensure ownership

    if (error) {
      console.error('Error deleting service:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the path to show updated data
    revalidatePath('/profile');

    return { success: true };

  } catch (error) {
    console.error('Server error deleting service:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete service';
    return { success: false, error: message };
  }
} 