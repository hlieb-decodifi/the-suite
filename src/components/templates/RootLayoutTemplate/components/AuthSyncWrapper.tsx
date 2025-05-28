'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@supabase/supabase-js';
import { UserInfo } from '@/components/common/Header';

type AuthSyncWrapperProps = {
  user: User | null;
  userInfo: UserInfo | null;
  children: React.ReactNode;
};

export function AuthSyncWrapper({
  user,
  userInfo,
  children,
}: AuthSyncWrapperProps) {
  const { setUser, setAvatarUrl, setIsLoading, signOut, hasHydrated } =
    useAuthStore();

  useEffect(() => {
    // Wait for Zustand to hydrate before syncing server auth data
    if (!hasHydrated) return;

    // Sync server auth data with client auth store
    if (user) {
      setUser(user);
      if (userInfo?.avatarUrl) {
        setAvatarUrl(userInfo.avatarUrl);
      }
    } else {
      signOut();
    }

    // Set loading to false since we have the initial auth state from server
    setIsLoading(false);
  }, [
    user,
    userInfo,
    setUser,
    setAvatarUrl,
    setIsLoading,
    signOut,
    hasHydrated,
  ]);

  // Show nothing until hydration is complete to prevent hydration mismatch
  if (!hasHydrated) {
    return null;
  }

  return <>{children}</>;
}
