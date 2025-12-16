import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { applyDateRangeFilter } from '@/utils/dateFilter';

// Server action for fetching admins data (inlined, not in a separate file)
export async function getAdminAdminsData({
  start,
  end,
  filterName,
  sortDirection,
}: {
  start?: string | undefined;
  end?: string | undefined;
  filterName?: string | undefined;
  sortDirection?: 'asc' | 'desc';
}) {
  'use server';
  const adminSupabase = await createAdminClient();
  // Get admin users by querying user_roles table
  const userRolesQuery = adminSupabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  const { data: adminUserIds, error: rolesError } = await userRolesQuery;
  if (rolesError) throw new Error('Could not fetch admin user IDs');

  const adminIds = adminUserIds?.map((row) => row.user_id) || [];
  if (adminIds.length === 0) {
    return { data: [], count: 0 };
  }

  let query = adminSupabase
    .from('users')
    .select('id, first_name, last_name, created_at')
    .in('id', adminIds);

  // Apply inclusive date range filter
  query = applyDateRangeFilter(query, 'created_at', start, end);

  // Server-side name filtering (case-insensitive)
  if (filterName) {
    // Use ilike for case-insensitive partial match on first_name or last_name
    query = query.or(
      `first_name.ilike.%${filterName}%,last_name.ilike.%${filterName}%`,
    );
  }
  // Server-side sorting
  if (sortDirection === 'asc' || sortDirection === 'desc') {
    query = query.order('created_at', { ascending: sortDirection === 'asc' });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch emails using Supabase Admin API

  let admins = Array.isArray(data)
    ? await Promise.all(
        data.map(async (u: unknown) => {
          let email = '';
          try {
            const { data: authUser, error: authError } =
              await adminSupabase.auth.admin.getUserById(
                (u as { id: string }).id,
              );
            if (authError) throw authError;
            email = authUser?.user?.email || '';
          } catch {
            email = '';
          }
          const user = u as {
            id: string;
            first_name?: string;
            last_name?: string;
            created_at: string;
          };
          return {
            id: user.id,
            name: [user.first_name, user.last_name].filter(Boolean).join(' '),
            email,
            createdAt: user.created_at,
          };
        }),
      )
    : [];

  // Fallback: If filterName is provided but not matched by Supabase (e.g., full name search), filter here
  if (filterName) {
    const filter = filterName.toLowerCase();
    admins = admins.filter((a) => a.name.toLowerCase().includes(filter));
  }

  return { admins: admins || [] };
}

// The page component now calls the server action directly
export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, unknown>>;
}) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const filterName =
    typeof params.filterName === 'string' ? params.filterName : undefined;
  const sortDirection = params.sortDirection === 'desc' ? 'desc' : 'asc';
  const { admins } = await getAdminAdminsData({
    start,
    end,
    filterName,
    sortDirection,
  });
  const safeAdmins = admins || [];
  // Direct import for client component
  // @ts-ignore
  const AdminAdminsPageClient = (await import('./AdminAdminsPageClient'))
    .default;
  return <AdminAdminsPageClient admins={safeAdmins} />;
}
