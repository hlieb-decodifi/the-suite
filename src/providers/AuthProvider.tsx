'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, setIsLoading, signOut } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Initialize: Check if we have a session already
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          signOut();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        signOut();
      } finally {
        setIsLoading(false);
      }
    };

    // Call initialization
    initializeAuth();

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
  }, [setUser, setSession, setIsLoading, signOut]);

  return <>{children}</>;
}
