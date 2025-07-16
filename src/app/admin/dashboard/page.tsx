import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboardPage } from '@/components/pages/AdminDashboardPage'

export default async function AdminDashboardRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Call the is_admin function
  const { data: isAdminResult } = await supabase.rpc('is_admin', { user_uuid: user.id })
  if (!isAdminResult) redirect('/dashboard')

  return <AdminDashboardPage />
} 