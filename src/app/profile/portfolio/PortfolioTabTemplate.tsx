import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortfolioSection } from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/components';

export async function PortfolioTabTemplate() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <PortfolioSection user={user} isEditable={true} />;
}
