import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/api/auth/actions';

export const metadata = {
  title: 'Dashboard | The Suite',
};

export default async function DashboardPage() {
  // Check authentication on the server
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to home if not authenticated
  if (!session) {
    redirect('/');
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-6 border rounded-lg shadow-sm bg-white">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-4">
          Welcome, {userData?.first_name} {userData?.last_name}!
        </p>
        <p className="text-gray-600 mb-6">
          You are successfully authenticated.
        </p>

        <form action={signOutAction}>
          <Button variant="outline" type="submit" className="w-full">
            Sign Out
          </Button>
        </form>
      </div>
    </main>
  );
}
