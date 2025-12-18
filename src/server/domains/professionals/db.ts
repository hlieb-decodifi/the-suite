import { createAdminClient } from '@/lib/supabase/server';
import { ServiceUI } from '@/types/services';
import { Appointment } from '@/types/appointments';

export type ProfessionalDetails = {
  id: string;
  email: string;
  fullName?: string;
  createdAt?: string | undefined;
  professionalProfileId: string | null;
  services: ServiceUI[];
  appointments: Appointment[];
  maxServices?: number | null;
};

/**
 * Fetch all details for a professional by userId for admin modal
 */
export async function fetchProfessionalDetails(
  userId: string,
): Promise<ProfessionalDetails | null> {
  // Check if current user is admin
  const { requireAdminUser } = await import('@/server/domains/admin/actions');
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return null;
  }

  const supabase = createAdminClient();

  // 1. Get user email from auth.users
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) return null;

  // 2. Get professional profile
  let professionalProfileId: string | null = null;
  let maxServices: number | null = null;
  let createdAt: string | undefined = undefined;
  const { data: profile, error: profileError } = await supabase
    .from('professional_profiles')
    .select('id, is_published, created_at')
    .eq('user_id', userId)
    .single();
  if (!profileError && profile) {
    professionalProfileId = profile.id;
    createdAt = profile.created_at ?? undefined;
    // Get max_services from service_limits table
    const { data: limitData } = await supabase
      .from('service_limits')
      .select('max_services')
      .eq('professional_profile_id', profile.id)
      .single();
    if (limitData?.max_services != null) {
      maxServices = limitData.max_services;
    }
  }

  // 3. Get services for this professional
  let services: ServiceUI[] = [];
  if (professionalProfileId) {
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price, duration, description')
      .eq('professional_profile_id', professionalProfileId);
    services = (servicesData || []).map(
      (s: {
        id: string;
        name: string;
        price: number;
        duration: number | string;
        description?: string | null;
      }): ServiceUI => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration:
          typeof s.duration === 'number'
            ? `${s.duration} min`
            : String(s.duration),
        description: s.description ?? '',
        is_archived: false, // Default to not archived for admin view
        archived_at: null,
      }),
    );
  }

  // 4. Get appointments for this professional
  let appointments: Appointment[] = [];
  if (professionalProfileId) {
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status')
      .eq('professional_profile_id', professionalProfileId);
    if (Array.isArray(appointmentsData)) {
      appointments = appointmentsData
        .filter(
          (a) =>
            a &&
            typeof a.id === 'string' &&
            typeof a.start_time === 'string' &&
            typeof a.end_time === 'string' &&
            typeof a.status === 'string',
        )
        .map((a) => ({
          id: a.id,
          startTime: a.start_time,
          endTime: a.end_time,
          client: '', // Not available
          professional: '', // Not available
          service: '', // Not available
          status: a.status,
        }));
    }
  }

  return {
    id: userId,
    email: authUser.user.email ?? '',
    professionalProfileId,
    services,
    appointments,
    maxServices,
    createdAt,
  };
}

/**
 * Update the max_services value for a professional profile by userId (admin only)
 */
export async function updateProfessionalMaxServices(
  userId: string,
  maxServices: number,
): Promise<{ success: boolean; error?: string }> {
  // Role check: ensure current user is admin
  const { requireAdminUser } = await import('@/server/domains/admin/actions');
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return { success: false, error: 'Admin access required' };
  }

  // Use admin client for the update
  const adminSupabase = createAdminClient();
  // Find professional profile by userId
  const { data: profile, error: profileError } = await adminSupabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (profileError || !profile) {
    return { success: false, error: 'Professional profile not found' };
  }
  // Upsert into service_limits table
  const { error: upsertError } = await adminSupabase
    .from('service_limits')
    .upsert(
      [
        {
          professional_profile_id: profile.id,
          max_services: maxServices,
        },
      ],
      { onConflict: 'professional_profile_id' },
    );
  if (upsertError) {
    return { success: false, error: upsertError.message };
  }
  return { success: true };
}
