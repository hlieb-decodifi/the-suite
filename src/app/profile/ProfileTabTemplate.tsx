import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileTabContent } from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/components';

export async function ProfileTabTemplate() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <ProfileTabContent user={user} isEditable={true} />;
}
