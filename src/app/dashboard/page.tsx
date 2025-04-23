import { redirect } from 'next/navigation';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { requireAuth } from '@/lib/supabase/auth';

export default async function DashboardPage() {
  // This will redirect to login if not authenticated
  await requireAuth();

  return <DashboardTemplate />;
}
