'use server';

import { SignUpFormValues } from '@/components/forms/SignUpForm/schema';
import { SignInFormValues } from '@/components/forms/SignInForm/schema';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getURL } from '@/lib/utils/url';

// Helper to get URL with trailing slash for auth redirects
const getAuthURL = () => getURL({ trailingSlash: true });

// Helper function to check if a user exists by email (case-insensitive)
// SECURITY NOTE: This function is intentionally NOT EXPORTED to prevent email enumeration attacks.
// It is only used internally by:
// - inviteAdminAction (protected by requireAdminUser)
// - signUpAction (legitimate duplicate check during registration)
// - convertOAuthToEmailAction (legitimate check when user converts account)
async function userExistsByEmail(
  email: string,
): Promise<{ exists: boolean; error?: string }> {
  const adminSupabase = createAdminClient();

  // Use the user_exists RPC function for efficient lookup
  const { data, error } = await adminSupabase.rpc('user_exists', {
    p_email: email,
  });

  if (error) {
    console.error(
      'userExistsByEmail: RPC error while checking for user:',
      error,
    );
    return { exists: false, error: 'Database error while checking for user' };
  }

  return { exists: data };
}

/**
 * Server action to invite a new admin
 */
export async function inviteAdminAction(
  email: string,
  firstName?: string,
  lastName?: string,
) {
  // Check if current user is admin
  const { requireAdminUser } = await import('@/server/domains/admin/actions');
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return { success: false, error: 'Admin access required' };
  }

  // Check if user already exists
  const { exists, error: userCheckError } = await userExistsByEmail(email);
  if (userCheckError) {
    return { success: false, error: 'Error checking for existing user.' };
  }
  if (exists) {
    return { success: false, error: 'A user with this email already exists.' };
  }

  // Get Supabase admin client
  const adminSupabase = createAdminClient();

  // Use Supabase's inviteUserByEmail to invite the admin
  // Note: The handle_new_user() database trigger automatically creates the user_roles entry
  // based on the 'role' metadata we pass here
  const { data: invitedUser, error: inviteError } =
    await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
      },
      redirectTo: `${getAuthURL()}auth/set-password?type=admin_invite`,
    });

  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  // Revalidate the admin list page after successful invite
  revalidatePath('/admin/admins');

  return { success: true, user: invitedUser };
}

/**
 * Server action for user signup
 */
export async function signUpAction(
  data: SignUpFormValues,
  redirectTo?: string,
) {
  const supabase = await createClient();

  // Duplicate email check
  const { exists, error: userCheckError } = await userExistsByEmail(data.email);
  if (userCheckError) {
    return {
      success: false,
      error: 'Error checking for existing user. Please try again later.',
    };
  }
  if (exists) {
    return {
      success: false,
      error:
        'An account with this email already exists. Please sign in or use a different email.',
    };
  }

  try {
    // Ensure userType is set
    if (!data.userType) {
      data.userType = 'client';
    }

    // Determine the correct redirect destination based on user type
    let finalRedirectTo = redirectTo;
    if (!finalRedirectTo) {
      finalRedirectTo =
        data.userType === 'client' ? '/client-profile' : '/profile';
    }

    // Create user with authentication
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.userType,
        },
        emailRedirectTo: `${getAuthURL()}auth/callback?redirect_to=${encodeURIComponent(finalRedirectTo)}&type=email_verification`,
      },
    });

    // Handle error
    if (authError) {
      console.error('Auth error:', authError);
      return {
        success: false,
        error: authError.message,
      };
    }

    // Return success
    revalidatePath('/');
    return {
      success: true,
      user: authData.user,
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      success: false,
      error: 'Database error saving new user',
    };
  }
}

/**
 * Server action for user sign in
 */
export async function signInAction(data: SignInFormValues) {
  const supabase = await createClient();

  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    // Handle error
    if (authError) {
      console.error('Auth error:', authError);
      return {
        success: false,
        error: authError.message,
      };
    }

    // Check if user is admin
    let isAdmin = false;
    if (authData.user) {
      const { data: adminResult } = await supabase.rpc('is_admin', {
        user_uuid: authData.user.id,
      });
      isAdmin = !!adminResult;
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      isAdmin, // <--- add this
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Failed to sign in. Please try again.',
    };
  }
}

/**
 * Server action to check if the user is authenticated
 * Will redirect to login if not authenticated
 */
export async function requireAuth(redirectTo = '/') {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect(redirectTo);
  }

  // Get session for the authenticated user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Server action to sign out
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/');
}

/**
 * Server action for password reset
 */
export async function resetPasswordAction(email: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAuthURL()}auth/reset-password?type=password_reset`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: 'Failed to send password reset email. Please try again.',
    };
  }
}

/**
 * Server action to update password during reset flow
 */
export async function updatePasswordAction(
  newPassword: string,
  accessToken?: string | null,
  refreshToken?: string | null,
) {
  const supabase = await createClient();
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Password update error:', error);
    return {
      success: false,
      error: 'Failed to update password. Please try again.',
    };
  }
}

/**
 * Server action to change user password
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
) {
  const supabase = await createClient();

  try {
    // Get current user info
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        success: false,
        error: 'No user found',
      };
    }

    // Check if user is OAuth user (can't change password)
    const isOAuth = user.identities?.some(
      (identity) => identity.provider === 'google',
    );
    if (isOAuth) {
      return {
        success: false,
        error: 'Cannot change password for Google OAuth accounts',
      };
    }

    // First verify the current password is correct by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      error: 'Failed to change password. Please try again.',
    };
  }
}

/**
 * Server action to update user email
 */
export async function updateEmailAction(newEmail: string, password: string) {
  const supabase = await createClient();

  try {
    // First verify the password is correct
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        success: false,
        error: 'No user email found',
      };
    }

    // Check if user is OAuth user (can't change email)
    const isOAuth = user.identities?.some(
      (identity) => identity.provider === 'google',
    );
    if (isOAuth) {
      return {
        success: false,
        error: 'Cannot change email for Google OAuth accounts',
      };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (verifyError) {
      return {
        success: false,
        error: 'Password is incorrect',
      };
    }

    // Update the email with confirmation redirect
    const { error } = await supabase.auth.updateUser(
      {
        email: newEmail,
      },
      {
        emailRedirectTo: `${getAuthURL()}auth/email-confirmed?type=email_change`,
      },
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath('/profile');
    revalidatePath('/client-profile');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Email update error:', error);
    return {
      success: false,
      error: 'Failed to update email. Please try again.',
    };
  }
}

/**
 * Server action for Google OAuth sign in/sign up
 */
export async function signInWithGoogleAction(redirectTo: string = '/profile') {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAuthURL()}auth/callback?redirect_to=${redirectTo}`,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Redirect to the OAuth provider
    if (data.url) {
      redirect(data.url);
    }

    return {
      success: false,
      error: 'Failed to initiate Google OAuth',
    };
  } catch (error) {
    console.error('Google OAuth action error:', error);
    return {
      success: false,
      error: 'Failed to sign in with Google. Please try again.',
    };
  }
}

/**
 * Form action wrapper for Google OAuth
 */
export async function googleOAuthFormAction(formData: FormData) {
  const redirectTo = (formData.get('redirectTo') as string) || '/profile';
  console.log('Redirect to:', redirectTo);
  // await signInWithGoogleAction(redirectTo);
  await signInWithGoogleAction(redirectTo);
}

/**
 * Server action to convert OAuth user to email/password user
 * This adds an email identity while keeping the OAuth identity
 */
export async function convertOAuthToEmailAction(
  newEmail: string,
  newPassword: string,
) {
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'No user found',
      };
    }

    // Check if user is OAuth user
    const isOAuth = user.identities?.some(
      (identity) => identity.provider === 'google',
    );
    if (!isOAuth) {
      return {
        success: false,
        error: 'This feature is only available for OAuth users',
      };
    }

    // Check if user already has email identity
    const hasEmailIdentity = user.identities?.some(
      (identity) => identity.provider === 'email',
    );
    if (hasEmailIdentity) {
      return {
        success: false,
        error: 'User already has email authentication enabled',
      };
    }

    // Check if the new email is already in use
    const { exists, error: userCheckError } = await userExistsByEmail(newEmail);
    if (userCheckError) {
      return {
        success: false,
        error: 'Error checking for existing user. Please try again later.',
      };
    }
    if (exists) {
      return {
        success: false,
        error: 'An account with this email already exists.',
      };
    }

    // Use admin client to update user with email and password
    const adminSupabase = createAdminClient();

    // Update user with new email and password
    const { error: updateError } =
      await adminSupabase.auth.admin.updateUserById(user.id, {
        email: newEmail,
        password: newPassword,
        email_confirm: true, // Auto-confirm the email
      });

    if (updateError) {
      console.error('Error converting OAuth user:', updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    return {
      success: true,
      message:
        'Successfully added email authentication. You can now sign in with either Google or email/password.',
    };
  } catch (error) {
    console.error('Error converting OAuth user:', error);
    return {
      success: false,
      error: 'Failed to convert account. Please try again.',
    };
  }
}

/**
 * Server action to get Google OAuth URL (without redirecting)
 */
export async function getGoogleOAuthUrlAction(
  redirectTo: string = '/profile',
  mode: 'signin' | 'signup' = 'signin',
  role?: 'client' | 'professional',
) {
  const supabase = await createClient();

  try {
    // Build the callback URL with mode and role parameters
    const callbackParams = new URLSearchParams();
    callbackParams.set('redirect_to', redirectTo);
    callbackParams.set('mode', mode);
    if (mode === 'signup' && role) {
      callbackParams.set('role', role);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAuthURL()}auth/callback?${callbackParams.toString()}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return {
        success: false,
        error: error.message,
        url: null,
      };
    }

    if (data.url) {
      return {
        success: true,
        error: null,
        url: data.url,
      };
    }

    return {
      success: false,
      error: 'Failed to generate OAuth URL',
      url: null,
    };
  } catch (error) {
    console.error('Google OAuth action error:', error);
    return {
      success: false,
      error: 'Failed to get Google OAuth URL',
      url: null,
    };
  }
}

/**
 * Server action to delete an admin user
 * Deletes the user from both auth and public tables
 */
export async function deleteAdminAction(userId: string) {
  // Check if current user is admin
  const { requireAdminUser } = await import('@/server/domains/admin/actions');
  const adminCheck = await requireAdminUser();
  if (!adminCheck.success) {
    return { success: false, error: 'Admin access required' };
  }

  const currentUserId = adminCheck.user.id;

  // Prevent users from deleting themselves
  if (currentUserId === userId) {
    return {
      success: false,
      error: 'You cannot delete your own admin account',
    };
  }

  try {
    const adminSupabase = createAdminClient();

    // Verify the user to be deleted is actually an admin
    const { data: userRole, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return {
        success: false,
        error: 'User is not an admin or does not exist',
      };
    }

    // Manually delete related records before deleting from auth
    // Step 1: Delete from user_roles
    const { error: roleDeleteError } = await adminSupabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleDeleteError) {
      console.error('Error deleting user role:', roleDeleteError);
      return {
        success: false,
        error: 'Failed to delete user role',
      };
    }

    // Step 2: Delete from public.users
    const { error: userDeleteError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      console.error('Error deleting user from public.users:', userDeleteError);
      return {
        success: false,
        error: 'Failed to delete user record',
      };
    }

    // Step 3: Delete from auth.users
    const { error: deleteAuthError } =
      await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError);
      return {
        success: false,
        error: deleteAuthError.message || 'Failed to delete user from authentication',
      };
    }

    // Revalidate the admin list page
    revalidatePath('/admin/admins');

    return { success: true };
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return {
      success: false,
      error: 'Failed to delete admin user. Please try again.',
    };
  }
}
