
import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';

// Server action for fetching admins data (inlined, not in a separate file)
export async function getAdminAdminsData({ start, end }: { start?: string | undefined; end?: string | undefined }) {
  'use server';
  const adminSupabase = await createAdminClient();
  // Query roles table for admin role id
  const { data: rolesData, error: rolesError } = await adminSupabase
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .single();
  if (rolesError || !rolesData?.id) throw new Error('Could not find admin role id');
  const ADMIN_ROLE_ID = rolesData.id;
  let query = adminSupabase
    .from('users')
    .select('id, first_name, last_name, created_at, role_id')
    .eq('role_id', ADMIN_ROLE_ID);
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch emails using Supabase Admin API
  const admins = Array.isArray(data)
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
          const user = u as { id: string; first_name?: string; last_name?: string; created_at: string };
          return {
            id: user.id,
            name: [user.first_name, user.last_name].filter(Boolean).join(' '),
            email,
            createdAt: user.created_at,
          };
        })
      )
    : [];

  return { admins };
}

// The page component now calls the server action directly
export default async function AdminAdminsPage({ searchParams }: { searchParams?: Promise<Record<string, unknown>> }) {
  const params = searchParams ? await searchParams : {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;
  const { admins } = await getAdminAdminsData({ start, end });
  // Direct import for client component
  // @ts-ignore
  const AdminAdminsPageClient = (await import('./AdminAdminsPageClient')).default;
  return <AdminAdminsPageClient admins={admins} />;
}
