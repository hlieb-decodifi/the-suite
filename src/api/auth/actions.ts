'use server';

import { SignUpFormValues } from '@/components/forms/SignUpForm/schema';
import { SignInFormValues } from '@/components/forms/SignInForm/schema';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  return url
}

/**
 * Server action for user signup
 */
export async function signUpAction(data: SignUpFormValues) {
  const supabase = await createClient();
  
  try {
    // Ensure userType is set
    if (!data.userType) {
      console.log('No userType provided, defaulting to client');
      data.userType = 'client';
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
        emailRedirectTo: `${getURL()}/auth/callback`,
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
      error: "Database error saving new user",
    };
  }
}

/**
 * Server action for user sign in
 */
export async function signInAction(data: SignInFormValues) {
  const supabase = await createClient();
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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

    // Return success with user and session data that will be used to update the auth store
    revalidatePath('/');
    return {
      success: true,
      user: authData.user,
      session: authData.session,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: "Failed to sign in. Please try again.",
    };
  }
}

/**
 * Server action to check if the user is authenticated
 * Will redirect to login if not authenticated
 */
export async function requireAuth(redirectTo = '/') {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect(redirectTo);
  }
  
  return session;
}

/**
 * Server action to sign out
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  // Note: The auth store will be cleared client-side after this action completes
}

/**
 * Server action to change user password
 */
export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const supabase = await createClient();
  
  try {
    // First verify the current password is correct by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: '', // This will be filled from the session
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
      error: "Failed to change password. Please try again.",
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return {
        success: false,
        error: "No user email found",
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

    // Update the email
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath('/profile');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Email update error:', error);
    return {
      success: false,
      error: "Failed to update email. Please try again.",
    };
  }
}