import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  avatarUrl: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAvatarUrl: (url: string | null) => void;
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
      avatarUrl: null,
      
      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        avatarUrl: null,
      }),
      
      setSession: (session) => set({ 
        session,
        user: session?.user || get().user,
        isAuthenticated: !!session,
        avatarUrl: null,
      }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      
      signOut: () => set({ 
        user: null,
        session: null,
        isAuthenticated: false,
        avatarUrl: null,
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
        avatarUrl: state.avatarUrl,
      }),
    }
  )
); 