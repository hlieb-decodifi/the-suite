'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardRefundsPageClient } from './DashboardRefundsPageClient';

export type DashboardRefundsPageProps = {
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export async function DashboardRefundsPage({
  startDate,
  endDate,
}: DashboardRefundsPageProps) {
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
    <DashboardRefundsPageClient
      user={user}
      isProfessional={!!isProfessional}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
