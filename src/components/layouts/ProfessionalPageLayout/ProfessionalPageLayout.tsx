'use server';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProfessionalPageLayoutClient } from './ProfessionalPageLayoutClient';

export type ProfessionalPageLayoutProps = {
  children: React.ReactNode;
  profileId: string;
};

export async function ProfessionalPageLayout({
  children,
  profileId,
}: ProfessionalPageLayoutProps) {
  const supabase = await createClient();

  // Check if the profile exists and is published
  const { data: profile, error } = await supabase
    .from('professional_profiles')
    .select(
      `
      *,
      users!inner(
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq('user_id', profileId)
    .single();

  // If no published profile exists, redirect to 404 page
  if (error || !profile) {
    notFound();
  }

  // Check if the current user is viewing their own profile and get user role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profileId;

  // Check if current user is a client (for showing message button)
  let isCurrentUserClient = false;
  let hasSharedAppointments = false;

  if (user && !isOwnProfile) {
    const { data: isClient } = await supabase.rpc('is_client', {
      user_uuid: user.id,
    });
    isCurrentUserClient = !!isClient;

    // If current user is a client, check for shared appointments
    if (isCurrentUserClient) {
      const { data: sharedAppointments } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', user.id)
        .eq('professional_profile_id', profile.id)
        .limit(1);

      hasSharedAppointments = !!(
        sharedAppointments && sharedAppointments.length > 0
      );
    }
  }

  return (
    <div className="w-full mx-auto">
      <ProfessionalPageLayoutClient
        profileId={profileId}
        isOwnProfile={isOwnProfile}
        allowMessages={profile.allow_messages}
        isCurrentUserClient={isCurrentUserClient}
        hasSharedAppointments={hasSharedAppointments}
        professionalName={`${profile.users.first_name} ${profile.users.last_name}`}
      >
        {children}
      </ProfessionalPageLayoutClient>
    </div>
  );
}
