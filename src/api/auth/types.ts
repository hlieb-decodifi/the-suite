import { User, Session } from '@supabase/supabase-js'
import { Tables } from '../common/database.types'

/**
 * Authentication API parameters
 */
export type SignInCredentials = {
  email: string
  password: string
}

export type SignUpCredentials = SignInCredentials & {
  full_name?: string
}

export type ResetPasswordParams = {
  email: string
}

export type UpdatePasswordParams = {
  password: string
}

/**
 * Authentication API response types
 */
export type AuthResponse = {
  user: User | null
  session: Session | null
  error: Error | null
}

/**
 * User with profile type combining Supabase Auth User with profile data
 */
export type UserWithProfile = User & {
  profile: Tables<'profiles'> | null
} 