import { useSupabaseBrowser } from '@/lib/supabase/index'
import { 
  useMutation, 
  UseMutationResult,
  useQuery,
  UseQueryResult,
  useQueryClient
} from '@tanstack/react-query'
import {
  signInWithPassword,
  signUp,
  resetPassword,
  updatePassword,
  signOut,
  getCurrentUser
} from './fetchers'
import {
  SignInCredentials,
  SignUpCredentials,
  ResetPasswordParams,
  UpdatePasswordParams,
  AuthResponse,
  UserWithProfile
} from './types'

/**
 * Authentication query keys
 */
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

/**
 * Hook for fetching and caching the current user's data
 */
export function useCurrentUser(): UseQueryResult<UserWithProfile | null, Error> {
  const supabase = useSupabaseBrowser()
  
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => getCurrentUser(supabase),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  })
}

/**
 * Hook for signing in a user with email and password
 */
export function useSignIn(): UseMutationResult<
  AuthResponse, 
  Error, 
  SignInCredentials, 
  unknown
> {
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: SignInCredentials) => 
      signInWithPassword(supabase, credentials),
    onSuccess: () => {
      // Invalidate and refetch relevant queries when user signs in
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    }
  })
}

/**
 * Hook for signing up a new user
 */
export function useSignUp(): UseMutationResult<
  AuthResponse, 
  Error, 
  SignUpCredentials, 
  unknown
> {
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: SignUpCredentials) => 
      signUp(supabase, credentials),
    onSuccess: () => {
      // Invalidate and refetch relevant queries when user signs up
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    }
  })
}

/**
 * Hook for requesting a password reset email
 */
export function useResetPassword(): UseMutationResult<
  { error: Error | null }, 
  Error, 
  ResetPasswordParams, 
  unknown
> {
  const supabase = useSupabaseBrowser()

  return useMutation({
    mutationFn: (params: ResetPasswordParams) => 
      resetPassword(supabase, params)
  })
}

/**
 * Hook for updating a user's password
 */
export function useUpdatePassword(): UseMutationResult<
  { error: Error | null }, 
  Error, 
  UpdatePasswordParams, 
  unknown
> {
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: UpdatePasswordParams) => 
      updatePassword(supabase, params),
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    }
  })
}

/**
 * Hook for signing out a user
 */
export function useSignOut(): UseMutationResult<
  { error: Error | null }, 
  Error, 
  void, 
  unknown
> {
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => signOut(supabase),
    onSuccess: () => {
      // Clear relevant cache when user signs out
      queryClient.removeQueries({ queryKey: authKeys.user() })
      queryClient.clear()
    }
  })
} 