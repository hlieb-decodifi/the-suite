'use server';

import { SignUpFormValues } from '@/components/forms/SignUpForm/schema';
import { SignInFormValues } from '@/components/forms/SignInForm/schema';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_BASE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'
  // Make sure to include `https://` when not localhost.
  console.log('url', url);
  console.log('process.env.NEXT_PUBLIC_BASE_URL', process.env.NEXT_PUBLIC_BASE_URL);
  console.log('process.env.NEXT_PUBLIC_VERCEL_URL', process.env.NEXT_PUBLIC_VERCEL_URL);
  console.log('process.env.NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL);
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
  redirect('/');
}

/**
 * Server action for password reset
 */
export async function resetPasswordAction(email: string) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}/auth/reset-password`,
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
      error: "Failed to send password reset email. Please try again.",
    };
  }
}

/**
 * Server action to update password during reset flow
 */
export async function updatePasswordAction(newPassword: string, accessToken?: string | null, refreshToken?: string | null) {
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
      error: "Failed to update password. Please try again.",
    };
  }
}

/**
 * Server action to change user password
 */
export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const supabase = await createClient();
  
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return {
        success: false,
        error: "No user found",
      };
    }

    // Check if user is OAuth user (can't change password)
    const isOAuth = user.identities?.some(identity => identity.provider === 'google');
    if (isOAuth) {
      return {
        success: false,
        error: "Cannot change password for Google OAuth accounts",
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

    // Check if user is OAuth user (can't change email)
    const isOAuth = user.identities?.some(identity => identity.provider === 'google');
    if (isOAuth) {
      return {
        success: false,
        error: "Cannot change email for Google OAuth accounts",
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
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    }, {
      emailRedirectTo: `${getURL()}auth/email-confirmed`,
    });

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
      error: "Failed to update email. Please try again.",
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
        redirectTo: `${getURL()}auth/callback?redirect_to=${redirectTo}`,
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
      error: "Failed to sign in with Google. Please try again.",
    };
  }
}

/**
 * Form action wrapper for Google OAuth
 */
export async function googleOAuthFormAction(formData: FormData) {
  const redirectTo = formData.get('redirectTo') as string || '/profile';
  console.log('Redirect to:', redirectTo);
  // await signInWithGoogleAction(redirectTo);
  await signInWithGoogleAction(redirectTo);
}

/**
 * Server action to get Google OAuth URL (without redirecting)
 */
export async function getGoogleOAuthUrlAction(
  redirectTo: string = '/profile', 
  mode: 'signin' | 'signup' = 'signin',
  role?: 'client' | 'professional'
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
        redirectTo: `${getURL()}auth/callback?${callbackParams.toString()}`,
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
      error: "Failed to get Google OAuth URL",
      url: null,
    };
  }
}