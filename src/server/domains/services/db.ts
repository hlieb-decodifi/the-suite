import { createClient } from '@/lib/supabase/server';
import { ServiceDB } from '@/types/services';

export type Service = ServiceDB;

export async function getProfessionalProfileId(userId: string) {
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

export async function getServicesForUser({
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
  const supabase = await createClient();
  try {
    const profileId = await getProfessionalProfileId(userId);
    
    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Build query
    let query = supabase
      .from('services')
      .select('*', { count: 'exact' });
      
    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Apply remaining filters and pagination
    const { data, error, count } = await query
      .eq('professional_profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching services:', error);
      throw new Error(error.message);
    }

    return { 
      services: data,
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0
    };

  } catch (error) {
    console.error('Error in getServicesForUser:', error);
    throw error;
  }
}

// Type for the service data input that handles optional fields correctly
type ServiceDataInput = {
  id?: string;
  name: string;
  description: string | null | undefined;
  price: number;
  duration: number;
};

export async function upsertService({
  userId,
  serviceData
}: {
  userId: string;
  serviceData: ServiceDataInput;
}) {
  const supabase = await createClient();
  
  try {
    const profileId = await getProfessionalProfileId(userId);
    
    // Validate service count for new services
    if (!serviceData.id) {
      const { count, error: countError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('professional_profile_id', profileId);
        
      if (countError) {
        throw new Error(countError.message);
      }
      
      if (count !== null && count >= 10) {
        throw new Error('You have reached the maximum limit of 10 services.');
      }
    }
    
    const serviceRecord = {
      name: serviceData.name,
      description: serviceData.description || null,
      price: serviceData.price,
      duration: serviceData.duration,
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
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  } catch (error) {
    console.error('Error in upsertService:', error);
    throw error;
  }
}

export async function deleteService({
  userId,
  serviceId
}: {
  userId: string;
  serviceId: string;
}) {
  const supabase = await createClient();
  
  try {
    const profileId = await getProfessionalProfileId(userId);
    
    // First check if service exists and belongs to user
    const { data: serviceData, error: checkError } = await supabase
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('professional_profile_id', profileId)
      .single();
      
    if (checkError || !serviceData) {
      throw new Error('Service not found or you do not have permission to delete it');
    }
    
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('professional_profile_id', profileId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteService:', error);
    throw error;
  }
} 