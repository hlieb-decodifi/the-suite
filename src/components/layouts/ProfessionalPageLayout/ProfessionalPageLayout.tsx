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

  // Check if the current user is viewing their own profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profileId;

  return (
    <div className="w-full mx-auto">
      <ProfessionalPageLayoutClient
        profileId={profileId}
        isOwnProfile={isOwnProfile}
      >
        {children}
      </ProfessionalPageLayoutClient>
    </div>
  );
}
