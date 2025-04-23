import { redirect } from 'next/navigation';
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/auth';

export default async function ProfilePage() {
  // This will redirect to login if not authenticated
  const { supabase, session } = await requireAuth();

  // Fetch user profile from supabase
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return <div>Error loading profile. Please try again later.</div>;
  }

  return (
    <div className="container mx-auto my-8 p-8 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">User Details</h2>
        <p>
          <strong>Email:</strong> {profile?.email}
        </p>
        <p>
          <strong>Name:</strong> {profile?.name || 'Not set'}
        </p>
        <p>
          <strong>Avatar:</strong> {profile?.avatar_url ? 'Set' : 'Not set'}
        </p>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Session Info</h2>
        <p>
          <strong>User ID:</strong> {session.user.id}
        </p>
        <p>
          <strong>Last Sign In:</strong>{' '}
          {new Date(session.user.last_sign_in_at || '').toLocaleString()}
        </p>
      </div>

      <div className="mt-8">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
