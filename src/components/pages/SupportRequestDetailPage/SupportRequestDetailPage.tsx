'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupportRequestDetailPageClient } from './SupportRequestDetailPageClient';
import { getSupportRequest, getAdminSupportRequest } from '@/server/domains/support-requests/actions';

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

  // Check if user is admin (via Supabase RPC)
  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  });

  let result;
  if (isAdmin) {
    result = await getAdminSupportRequest(id);
  } else if (isProfessional) {
    result = await getSupportRequest(id);
  } else {
    redirect('/');
  }

  if (!result.success || !result.supportRequest) {
    redirect('/dashboard/support-requests');
  }

  return (
    <SupportRequestDetailPageClient
      supportRequest={result.supportRequest}
      isProfessional={!!isProfessional}
      currentUserId={user.id}
      isAdmin={!!isAdmin}
    />
  );
}