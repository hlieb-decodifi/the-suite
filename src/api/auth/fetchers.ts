import { TypedSupabaseClient } from '../common/types'
import { 
  AuthResponse, 
  SignInCredentials, 
  SignUpCredentials, 
  ResetPasswordParams, 
  UpdatePasswordParams,
  UserWithProfile
} from './types'

/**
 * Signs in a user with email and password
 */
export const signInWithPassword = async (
  supabase: TypedSupabaseClient,
  credentials: SignInCredentials
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword(credentials)
  
  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error as Error | null
  }
}

/**
 * Signs up a new user with email and password
 */
export const signUp = async (
  supabase: TypedSupabaseClient,
  credentials: SignUpCredentials
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name || null
      }
    }
  })

  // If sign up is successful, create a profile record
  if (data?.user && !error) {
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: credentials.email,
        full_name: credentials.full_name || null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
  }

  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error as Error | null
  }
}

/**
 * Sends a password reset email
 */
export const resetPassword = async (
  supabase: TypedSupabaseClient,
  params: ResetPasswordParams
): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: `${window.location.origin}/auth/update-password`
  })

  return { error: error as Error | null }
}

/**
 * Updates user password (for use after password reset)
 */
export const updatePassword = async (
  supabase: TypedSupabaseClient,
  params: UpdatePasswordParams
): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.updateUser({
    password: params.password
  })

  return { error: error as Error | null }
}

/**
 * Signs out a user
 */
export const signOut = async (
  supabase: TypedSupabaseClient
): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.signOut()
  return { error: error as Error | null }
}

/**
 * Fetches the currently authenticated user along with their profile
 */
export const getCurrentUser = async (
  supabase: TypedSupabaseClient
): Promise<UserWithProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // Fetch the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return {
    ...user,
    profile: profile || null
  }
} 