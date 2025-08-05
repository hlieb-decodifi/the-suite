import { createAdminClient } from '@/lib/supabase/server';

export async function getAdminClientsData({ start, end }: { start?: string | undefined; end?: string | undefined }) {
  const adminSupabase = await createAdminClient();
  // Query roles table for client role id
  const { data: rolesData, error: rolesError } = await adminSupabase
    .from('roles')
    .select('id')
    .eq('name', 'client')
    .single();
  if (rolesError || !rolesData?.id) throw new Error('Could not find client role id');
  const CLIENT_ROLE_ID = rolesData.id;
  let query = adminSupabase
    .from('users')
    .select('id, first_name, last_name, created_at, role_id, client_profiles(id)')
    .eq('role_id', CLIENT_ROLE_ID);
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch emails using Supabase Admin API
  const clients = Array.isArray(data)
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
          // Fetch completed appointments count
          const user = u as {
            id: string;
            first_name?: string;
            last_name?: string;
            created_at: string;
            client_profiles?: { id?: string };
          };
          let completedAppointmentsCount = 0;
          const { count: completedCountRaw } = await adminSupabase
            .from('appointments_with_status')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user.id)
            .eq('computed_status', 'completed');
          completedAppointmentsCount = completedCountRaw || 0;
          return {
            id: user.id,
            name: [user.first_name, user.last_name].filter(Boolean).join(' '),
            email,
            createdAt: user.created_at,
            clientProfileId: user.client_profiles?.id || null,
            completedAppointmentsCount,
          };
        })
      )
    : [];

  return { clients };
}

export type AdminClientsPageProps = {
  searchParams?: Promise<Record<string, unknown>>;
};

export default async function AdminClientsPage({ searchParams }: AdminClientsPageProps) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const { clients } = await getAdminClientsData({ start, end });
  // @ts-ignore
  const AdminClientsPageClient = (await import('./AdminClientsPageClient')).default;
  return <AdminClientsPageClient clients={clients} />;
}