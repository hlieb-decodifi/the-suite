import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  signOut: () => void;
  
  // Derived state
  getUser: () => User | null;
  getSession: () => Session | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      
      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
      }),
      
      setSession: (session) => set({ 
        session,
        // Update user from session if available
        user: session?.user || get().user,
        isAuthenticated: !!session,
      }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      signOut: () => set({ 
        user: null,
        session: null,
        isAuthenticated: false,
      }),
      
      // Derived state
      getUser: () => get().user,
      getSession: () => get().session,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        // Use sessionStorage in the browser, but provide a fallback for SSR
        if (typeof window !== 'undefined') {
          return window.sessionStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 