import { createAdminClient } from '@/lib/supabase/server';

export async function getAdminProfessionalsData({ start, end }: { start?: string | undefined; end?: string | undefined }) {
  const adminSupabase = await createAdminClient();
  // Query roles table for professional role id
  const { data: rolesData, error: rolesError } = await adminSupabase
    .from('roles')
    .select('id')
    .eq('name', 'professional')
    .single();
  if (rolesError || !rolesData?.id) throw new Error('Could not find professional role id');
  const PROFESSIONAL_ROLE_ID = rolesData.id;
  let query = adminSupabase
    .from('users')
    .select('id, first_name, last_name, created_at, role_id, professional_profiles(id, is_published)')
    .eq('role_id', PROFESSIONAL_ROLE_ID);
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch emails using Supabase Admin API
  const professionals = Array.isArray(data)
    ? await Promise.all(
        data.map(async (u: unknown) => {
          let email = '';
          try {
            const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById((u as { id: string }).id);
            if (authError) throw authError;
            email = authUser?.user?.email || '';
          } catch {
            email = '';
          }
          // Fetch service count
          const user = u as {
            id: string;
            first_name?: string;
            last_name?: string;
            created_at: string;
            professional_profiles?: { id?: string; is_published?: boolean };
          };
          let serviceCount = 0;
          if (user.professional_profiles?.id) {
            const { count: serviceCountRaw } = await adminSupabase
              .from('services')
              .select('id', { count: 'exact', head: true })
              .eq('professional_profile_id', user.professional_profiles.id);
            serviceCount = serviceCountRaw || 0;
          }
          // Fetch completed appointments count
          let completedAppointmentsCount = 0;
          if (user.professional_profiles?.id) {
            const { count: completedCountRaw } = await adminSupabase
              .from('appointments_with_status')
              .select('id', { count: 'exact', head: true })
              .eq('professional_profile_id', user.professional_profiles.id)
              .eq('computed_status', 'completed');
            completedAppointmentsCount = completedCountRaw || 0;
          }
          // Published status
          const isPublished = !!user.professional_profiles?.is_published;
          return {
            id: user.id,
            name: [user.first_name, user.last_name].filter(Boolean).join(' '),
            email,
            createdAt: user.created_at,
            professionalProfileId: user.professional_profiles?.id || null,
            serviceCount,
            completedAppointmentsCount,
            isPublished,
          };
        })
      )
    : [];

  return { professionals };
}

export type AdminProfessionalsPageProps = {
  searchParams?: Promise<Record<string, unknown>>;
};

export default async function AdminProfessionalsPage({ searchParams }: AdminProfessionalsPageProps) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const { professionals } = await getAdminProfessionalsData({ start, end });
  // @ts-ignore
  const AdminProfessionalsPageClient = (await import('./AdminProfessionalsPageClient')).default;
  return <AdminProfessionalsPageClient professionals={professionals} />;
}