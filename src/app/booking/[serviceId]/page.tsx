import { BookingPageTemplate } from '@/components/templates/BookingPageTemplate';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type BookingPageProps = {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ date?: string; professional?: string }>;
};

// Enable dynamic rendering and disable cache for real-time availability
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { serviceId } = resolvedParams;
  const { date } = resolvedSearchParams;

  // Validate serviceId
  if (!serviceId || typeof serviceId !== 'string') {
    notFound();
  }

  // Check authentication and role
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user data to check role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(
      `
      id,
      role_id,
      roles(name)
    `,
    )
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user data:', userError);
    redirect('/');
  }

  // Check if user has "client" role
  const userRole = userData.roles?.name;
  if (userRole !== 'client') {
    // Redirect based on role
    if (userRole === 'professional') {
      redirect('/dashboard');
    } else if (userRole === 'admin') {
      redirect('/admin');
    } else {
      redirect('/');
    }
  }

  return (
    <BookingPageTemplate
      serviceId={serviceId}
      {...(date && { preselectedDate: date })}
    />
  );
}
