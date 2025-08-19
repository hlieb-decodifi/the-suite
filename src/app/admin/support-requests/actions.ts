"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupportRequest } from "@/types/support_requests";

export async function fetchAdminSupportRequests({ start, end }: { start?: string; end?: string }) {
  // Check admin role with regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: isAdmin } = await supabase.rpc("is_admin", { user_uuid: user.id });
  if (!isAdmin) throw new Error("You do not have admin access");

  // Fetch support requests with admin client
  const adminSupabase = await createAdminClient();
  let query = adminSupabase
    .from("support_requests")
    .select(`
      *,
      client_user:users!client_id(id, first_name, last_name, profile_photos(url)),
      professional_user:users!professional_id(id, first_name, last_name, profile_photos(url)),
      appointments(id, start_time, end_time, status, bookings(id, booking_services(services(id, name)))),
      conversations(id)
    `)
    .order("created_at", { ascending: false });
  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // Map nulls to undefined for optional fields
  return ((data || []).map((req: Record<string, unknown>) => ({
    ...req,
    professional_id: req.professional_id ?? undefined,
    booking_id: req.booking_id ?? undefined,
    appointment_id: req.appointment_id ?? undefined,
    booking_payment_id: req.booking_payment_id ?? undefined,
    requested_amount: req.requested_amount ?? undefined,
    original_amount: req.original_amount ?? undefined,
    transaction_fee: req.transaction_fee ?? undefined,
    refund_amount: req.refund_amount ?? undefined,
    stripe_refund_id: req.stripe_refund_id ?? undefined,
    professional_notes: req.professional_notes ?? undefined,
    declined_reason: req.declined_reason ?? undefined,
    processed_at: req.processed_at ?? undefined,
    resolved_at: req.resolved_at ?? undefined,
    resolved_by: req.resolved_by ?? undefined,
    resolution_notes: req.resolution_notes ?? undefined,
    client_user: req.client_user,
    professional_user: req.professional_user,
    appointments: req.appointments,
    conversations: req.conversations,
  })) as unknown) as SupportRequest[];
}
