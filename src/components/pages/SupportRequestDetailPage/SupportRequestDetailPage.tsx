'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupportRequestDetailPageClient } from './SupportRequestDetailPageClient';
import { getSupportRequest, getAdminSupportRequest, getAdminSupportRequestMessages } from '@/server/domains/support-requests/actions';

export type SupportRequestDetailPageProps = {
  id: string;
};


export async function SupportRequestDetailPage({ id }: SupportRequestDetailPageProps) {
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
  let initialMessages = undefined;
  let usersMap = undefined;
  if (isAdmin) {
    result = await getAdminSupportRequest(id);
    // Fetch messages as admin
    const messagesResult = await getAdminSupportRequestMessages(id);
    if (messagesResult.success && 'messages' in messagesResult) {
      initialMessages = messagesResult.messages;
      usersMap = messagesResult.users;
    }
  } else if (isProfessional) {
    result = await getSupportRequest(id);
    // Optionally: fetch messages for professionals here if needed
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
      initialMessages={initialMessages ?? []}
      usersMap={usersMap ?? {}}
    />
  );
}