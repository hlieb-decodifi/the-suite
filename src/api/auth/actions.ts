'use server';

import { SignUpFormValues } from '@/components/forms/SignUpForm/schema';
import { SignInFormValues } from '@/components/forms/SignInForm/schema';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`,
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