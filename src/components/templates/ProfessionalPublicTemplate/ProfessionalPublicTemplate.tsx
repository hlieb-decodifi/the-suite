import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProfessionalPublicView } from './components/ProfessionalPublicView/ProfessionalPublicView';

export type ProfessionalPublicTemplateProps = {
  profileId: string;
};

export async function ProfessionalPublicTemplate({
  profileId,
}: ProfessionalPublicTemplateProps) {
  const supabase = await createClient();

  // Check if the profile exists and is published
  const { data: profile, error } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', profileId)
    .eq('is_published', true)
    .single();

  // If no published profile exists, redirect to 404 page
  if (error || !profile) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ProfessionalPublicView profileId={profileId} />
    </div>
  );
}
