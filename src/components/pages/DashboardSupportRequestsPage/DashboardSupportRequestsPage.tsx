'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardSupportRequestsPageClient } from './DashboardSupportRequestsPageClient';

export type DashboardSupportRequestsPageProps = {
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string | undefined;
  category?: string | undefined;
};

export async function DashboardSupportRequestsPage({
  startDate,
  endDate,
  status,
  category,
}: DashboardSupportRequestsPageProps) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if user is professional
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  return (
    <DashboardSupportRequestsPageClient
      isProfessional={!!isProfessional}
      startDate={startDate}
      endDate={endDate}
      status={status}
      category={category}
    />
  );
}
