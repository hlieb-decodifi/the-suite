import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminUser } from './auth'

export async function getBookingsStats(options?: { from?: string; to?: string }) {
  const supabase = await createClient()
  await requireAdminUser(supabase)

  // Default to last 30 days if not provided
  const now = new Date()
  const to = options?.to ?? now.toISOString()
  const from =
    options?.from ??
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Use admin client for bookings queries
  const adminSupabase = createAdminClient()

  // Total bookings in range
  const { count: totalBookings } = await adminSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', from)
    .lte('created_at', to)

  // Bookings per day in range
  const { data: bookingsPerDay, error: bookingsPerDayError } = await adminSupabase
    .from('bookings')
    .select('created_at')
    .gte('created_at', from)
    .lte('created_at', to)

  if (bookingsPerDayError) throw bookingsPerDayError

  // Aggregate bookings per day
  const perDay: Record<string, number> = {}
  bookingsPerDay?.forEach(({ created_at }) => {
    const day = created_at.slice(0, 10) // YYYY-MM-DD
    perDay[day] = (perDay[day] || 0) + 1
  })

  return {
    totalBookings: totalBookings || 0,
    bookingsPerDay: perDay,
  }
} 