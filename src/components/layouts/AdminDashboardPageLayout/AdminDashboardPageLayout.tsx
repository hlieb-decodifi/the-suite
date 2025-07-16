'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminDashboardPageLayoutClient } from '@/components/layouts/AdminDashboardPageLayout/AdminDashboardPageLayoutClient';

export type AdminDashboardPageLayoutProps = {
  children: React.ReactNode;
};

export async function AdminDashboardPageLayout({ children }: AdminDashboardPageLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Check admin
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
  if (!isAdmin) redirect('/dashboard');

  return (
    <div className="w-full mx-auto">
      <AdminDashboardPageLayoutClient user={user}>
        {children}
      </AdminDashboardPageLayoutClient>
    </div>
  );
} 