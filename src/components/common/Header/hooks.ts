'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAvatarUrlQuery } from '@/api/photos/hooks';

/**
 * Custom hook for managing authentication data in the header
 * @returns Authentication state, user info, and loading state
 */
export function useAuthData() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: avatarUrl, isLoading: isAvatarLoading } = useAvatarUrlQuery(
    user?.id,
  );

  const isLoading = isAuthLoading || isAvatarLoading;
  
  // Create userInfo object from auth state
  const userInfo = isAuthenticated && user
    ? {
        name:
          `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
          'User',
        email: String(user.email || ''),
        avatarUrl: avatarUrl || null,
      }
    : undefined;
    
  return { isAuthenticated, userInfo, isLoading };
}

/**
 * Custom hook for managing authentication modals
 * @returns Modal state and handlers
 */
export function useAuthModals() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  
  const handlers = {
    handleSignUpClick: () => setIsSignUpModalOpen(true),
    handleSignInClick: () => setIsSignInModalOpen(true),
    handleModalClose: () => setIsSignUpModalOpen(false),
    handleSignInModalClose: () => setIsSignInModalOpen(false),
  };
  
  return {
    isSignUpModalOpen,
    isSignInModalOpen,
    setIsSignUpModalOpen,
    setIsSignInModalOpen,
    handlers,
  };
} 