'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useRef } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    setSession,
    setUser,
    setIsLoading,
    signOut,
    isLoading,
    user,
    hasHydrated,
  } = useAuthStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Wait for Zustand to hydrate before initializing auth
    if (!hasHydrated) return;

    const supabase = createClient();

    // Initialize: Check if we have a session already
    const initializeAuth = async () => {
      try {
        // If auth state is already synced from server (not loading and has user), skip initialization
        if (!isLoading && user) {
          hasInitialized.current = true;
          return;
        }

        setIsLoading(true);

        // Get the current user (secure method)
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (authUser && !error) {
          // Get fresh session for this authenticated user
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(authUser);
        } else {
          signOut();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        signOut();
      } finally {
        setIsLoading(false);
        hasInitialized.current = true;
      }
    };

    // Only initialize if we haven't already
    if (!hasInitialized.current) {
      initializeAuth();
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        signOut();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [
    setUser,
    setSession,
    setIsLoading,
    signOut,
    isLoading,
    user,
    hasHydrated,
  ]);

  return <>{children}</>;
}
