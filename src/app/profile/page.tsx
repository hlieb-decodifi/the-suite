import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileTemplate } from '@/components/templates/ProfileTemplate/ProfileTemplate';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await searchParams since it's a Promise in Next.js 15+
  const resolvedSearchParams = await searchParams;
  
  // Get the supabase client
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // If no user, redirect to login
  if (!user) {
    redirect('/auth/login');
  }
  
  // Return the template with the user and search params
  return <ProfileTemplate user={user} searchParams={resolvedSearchParams} />;
}
