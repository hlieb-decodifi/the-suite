'use client';
import { useState } from 'react';

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