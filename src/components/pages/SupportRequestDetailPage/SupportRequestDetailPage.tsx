'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupportRequestDetailPageClient } from './SupportRequestDetailPageClient';
import { getSupportRequest } from '@/server/domains/support-requests/actions';

export type SupportRequestDetailPageProps = {
  id: string;
};

export async function SupportRequestDetailPage({
  id,
}: SupportRequestDetailPageProps) {
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

  // Fetch the support request details
  const result = await getSupportRequest(id);
  
  if (!result.success || !result.supportRequest) {
    redirect('/dashboard/support-requests');
  }

  return (
    <SupportRequestDetailPageClient
      supportRequest={result.supportRequest}
      isProfessional={!!isProfessional}
      currentUserId={user.id}
    />
  );
}