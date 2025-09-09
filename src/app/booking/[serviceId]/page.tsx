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

  // Fetch user role to check access
  const { data: userRoleData, error: userRoleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (userRoleError || !userRoleData) {
    console.error('Error fetching user role:', userRoleError);
    redirect('/');
  }

  // Check if user has "client" role
  const userRole = userRoleData.role;
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
