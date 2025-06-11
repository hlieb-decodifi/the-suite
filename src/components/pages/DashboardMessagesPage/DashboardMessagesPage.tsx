'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardMessagesPageClient } from './DashboardMessagesPageClient';
import { getConversations, getAvailableProfessionals } from '@/server/domains/messages/actions';

export async function DashboardMessagesPage() {
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

  // Fetch conversations
  const conversationsResult = await getConversations();
  const conversations = conversationsResult.success ? conversationsResult.conversations || [] : [];

  // For clients, also fetch available professionals
  let availableProfessionals: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profession?: string | undefined;
    profile_photo_url?: string | undefined;
  }> = [];

  if (!isProfessional) {
    const professionalsResult = await getAvailableProfessionals();
    availableProfessionals = professionalsResult.success ? professionalsResult.professionals || [] : [];
      }

    return (
    <DashboardMessagesPageClient 
      isProfessional={!!isProfessional}
      initialConversations={conversations}
      availableProfessionals={availableProfessionals}
      currentUserId={user.id}
    />
  );
}
