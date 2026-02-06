'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Checks if the current user is an admin. Returns the session user if admin, otherwise returns an error object.
 */
export async function requireAdminUser() {
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getUser();
  const sessionUser = sessionData?.user;
  if (sessionError || !sessionUser) {
    return { success: false, error: 'Not authenticated' };
  }
  // Check if user has admin role
  const { data: userRoleData, error: userRoleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', sessionUser.id)
    .single();
  if (userRoleError || !userRoleData || userRoleData.role !== 'admin') {
    return { success: false, error: 'Permission denied: admin only' };
  }
  return { success: true, user: sessionUser };
}

/**
 * Assign a role to a user (admin-only action)
 */
export async function assignUserRoleAction(
  userId: string,
  role: 'client' | 'professional' | 'admin',
) {
  // Check if current user is admin
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const adminSupabase = createAdminClient();

    // Check if user exists
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Upsert the user role
    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          role: role,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return { success: false, error: 'Failed to assign role' };
    }

    // Create appropriate profile based on role
    if (role === 'client') {
      const { error: profileError } = await adminSupabase
        .from('client_profiles')
        .upsert(
          { user_id: userId },
          {
            onConflict: 'user_id',
            ignoreDuplicates: true,
          },
        );

      if (profileError) {
        console.error('Error creating client profile:', profileError);
      }

      // Clean up professional profile if it exists
      await adminSupabase
        .from('professional_profiles')
        .delete()
        .eq('user_id', userId);
    } else if (role === 'professional') {
      const { error: profileError } = await adminSupabase
        .from('professional_profiles')
        .upsert(
          { user_id: userId },
          {
            onConflict: 'user_id',
            ignoreDuplicates: true,
          },
        );

      if (profileError) {
        console.error('Error creating professional profile:', profileError);
      }

      // Clean up client profile if it exists
      await adminSupabase.from('client_profiles').delete().eq('user_id', userId);
    } else if (role === 'admin') {
      // Clean up both profiles for admin
      await adminSupabase.from('client_profiles').delete().eq('user_id', userId);
      await adminSupabase
        .from('professional_profiles')
        .delete()
        .eq('user_id', userId);
    }

    // Revalidate admin pages
    revalidatePath('/admin/admins');
    revalidatePath('/admin/professionals');
    revalidatePath('/admin/clients');

    return { success: true };
  } catch (error) {
    console.error('Error in assignUserRoleAction:', error);
    return {
      success: false,
      error: 'Failed to assign role. Please try again.',
    };
  }
}
