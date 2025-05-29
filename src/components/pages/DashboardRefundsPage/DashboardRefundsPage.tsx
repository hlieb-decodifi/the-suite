'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardRefundsPageClient } from './DashboardRefundsPageClient';

export async function DashboardRefundsPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user is professional
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  return (
    <DashboardRefundsPageClient user={user} isProfessional={!!isProfessional} />
  );
}
