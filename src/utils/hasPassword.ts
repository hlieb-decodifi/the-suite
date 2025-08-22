// Utility to check if a user has a password set (i.e., not just Google OAuth)
import { User } from '@supabase/supabase-js';

export function hasPassword(user: User | null): boolean {
  // Debug logging

    console.log('[hasPassword] user:', user);
    console.log('[hasPassword] identities:', user?.identities);

  if (!user?.identities) return false;
  return user.identities.some(identity => identity.provider === 'email');
}
