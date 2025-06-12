import { User } from '@supabase/supabase-js';

/**
 * Check if a user signed up with Google OAuth
 */
export function isOAuthUser(user: User | null): boolean {
  if (!user?.identities) return false;
  
  return user.identities.some(identity => 
    identity.provider === 'google'
  );
}

/**
 * Check if a user can change their email (not OAuth users)
 */
export function canChangeEmail(user: User | null): boolean {
  return !isOAuthUser(user);
}

/**
 * Check if a user can change their password (not OAuth users)
 */
export function canChangePassword(user: User | null): boolean {
  return !isOAuthUser(user);
}

/**
 * Get the OAuth provider name for display
 */
export function getOAuthProvider(user: User | null): string | null {
  if (!user?.identities) return null;
  
  const oauthIdentity = user.identities.find(identity => 
    identity.provider !== 'email'
  );
  
  return oauthIdentity?.provider || null;
} 