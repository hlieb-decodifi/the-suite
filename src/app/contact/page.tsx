'use server';

import { ContactTemplate } from '@/components/templates/ContactTemplate';
import { createClient } from '@/lib/supabase/server';

export default async function ContactPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userData = null;

  // If user is authenticated, get their profile data for prefilling
  if (user) {
    // Get user data from users table and profiles
    const { data: userProfile } = await supabase
      .from('users')
      .select(
        `
        id,
        first_name,
        last_name,
        professional_profiles (
          phone_number
        ),
        client_profiles (
          phone_number
        )
      `,
      )
      .eq('id', user.id)
      .single();

    if (userProfile) {
      userData = {
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
        email: user.email || '',
        phone:
          userProfile.professional_profiles?.phone_number ||
          userProfile.client_profiles?.phone_number ||
          '',
      };
    }
  }

  return <ContactTemplate userData={userData} />;
}
