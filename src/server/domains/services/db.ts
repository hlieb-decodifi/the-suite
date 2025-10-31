import { createClient } from '@/lib/supabase/server';
import { ServiceDB } from '@/types/services';

export type Service = ServiceDB;

export async function getProfessionalProfileId(userId: string) {
  const supabase = await createClient();

  // First check if user is actually a professional
  const { data: isProfessional, error: roleError } = await supabase.rpc(
    'is_professional',
    { user_uuid: userId },
  );

  if (roleError) {
    console.error('Error checking if user is professional:', roleError);
    throw new Error('Could not verify user role.');
  }

  if (!isProfessional) {
    throw new Error(
      'User is not a professional. Cannot access professional profile.',
    );
  }

  const { data, error } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching professional profile ID:', error);

    // If profile doesn't exist but user is professional, try to create it
    if (error.code === 'PGRST116') {
      console.log(
        'Professional profile not found, attempting to create one for user:',
        userId,
      );

      const { data: newProfile, error: createError } = await supabase
        .from('professional_profiles')
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating professional profile:', createError);
        throw new Error('Could not create professional profile for the user.');
      }

      if (newProfile) {
        console.log('Created new professional profile with ID:', newProfile.id);
        return newProfile.id;
      }
    }

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

    // Build query - include both archived and active services for professional management
    let query = supabase.from('services').select('*', { count: 'exact' });

    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply remaining filters and pagination
    // Sort by is_archived first (active services first), then by created_at (newest first)
    const { data, error, count } = await query
      .eq('professional_profile_id', profileId)
      .order('is_archived', { ascending: true })
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
      totalPages: count ? Math.ceil(count / pageSize) : 0,
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
  serviceData,
}: {
  userId: string;
  serviceData: ServiceDataInput;
}) {
  const supabase = await createClient();

  try {
    const profileId = await getProfessionalProfileId(userId);

    // Validate service count for new services
    if (!serviceData.id) {
      // Get the service limit for this professional
      const { data: limitData, error: limitError } = await supabase.rpc(
        'get_service_limit',
        { prof_profile_id: profileId },
      );

      if (limitError) {
        console.error('Error fetching service limit:', limitError);
        throw new Error('Could not verify service limit.');
      }

      // Get current service count (excluding archived services)
      const { count, error: countError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('professional_profile_id', profileId)
        .eq('is_archived', false);

      if (countError) {
        throw new Error(countError.message);
      }

      const maxServices = limitData || 50; // Default to 50 if no limit found

      if (count !== null && count >= maxServices) {
        throw new Error(
          `You have reached the maximum limit of ${maxServices} services.`,
        );
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
  serviceId,
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
      throw new Error(
        'Service not found or you do not have permission to delete it',
      );
    }

    // Check if service has any bookings - if yes, suggest archiving instead
    const { count: bookingCount, error: bookingError } = await supabase
      .from('booking_services')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId);

    if (bookingError) {
      console.error('Error checking bookings:', bookingError);
      throw new Error('Could not verify if service has bookings');
    }

    if (bookingCount && bookingCount > 0) {
      throw new Error(
        'Cannot delete service with existing bookings. Use archive instead.',
      );
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

export async function archiveService({
  userId,
  serviceId,
}: {
  userId: string;
  serviceId: string;
}) {
  const supabase = await createClient();

  try {
    // Validate user ownership by getting profile ID (this will throw if user doesn't have a professional profile)
    await getProfessionalProfileId(userId);

    // Use the archive_service function from the database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('archive_service' as any, {
      service_id: serviceId,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Service not found or already archived');
    }

    return true;
  } catch (error) {
    console.error('Error in archiveService:', error);
    throw error;
  }
}

export async function unarchiveService({
  userId,
  serviceId,
}: {
  userId: string;
  serviceId: string;
}) {
  const supabase = await createClient();

  try {
    // Validate user ownership by getting profile ID (this will throw if user doesn't have a professional profile)
    await getProfessionalProfileId(userId);

    // Use the unarchive_service function from the database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('unarchive_service' as any, {
      service_id: serviceId,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Service not found or already active');
    }

    return true;
  } catch (error) {
    console.error('Error in unarchiveService:', error);
    throw error;
  }
}
