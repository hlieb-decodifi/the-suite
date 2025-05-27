import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ServicesSection } from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/components';

export async function ServicesTabTemplate() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <ServicesSection user={user} isEditable={true} />;
}
