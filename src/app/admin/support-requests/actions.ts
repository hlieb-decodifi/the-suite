'use server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SupportRequest } from '@/types/support_requests';

export async function fetchAdminSupportRequests({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  // Check admin role with regular client
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  });
  if (!isAdmin) throw new Error('You do not have admin access');

  // Fetch support requests with admin client (only fields needed for table)
  const adminSupabase = await createAdminClient();
  let query = adminSupabase
    .from('support_requests')
    .select(
      `
      id,
      created_at,
      title,
      status,
      client_user:users!client_id(id, first_name, last_name),
      professional_user:users!professional_id(id, first_name, last_name)
    `,
    )
    .order('created_at', { ascending: false });
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // Map nulls to undefined for optional fields
  return (data || []).map((req: Record<string, unknown>) => ({
    ...req,
    client_user: req.client_user ?? undefined,
    professional_user: req.professional_user ?? undefined,
  })) as unknown as SupportRequest[];
}
