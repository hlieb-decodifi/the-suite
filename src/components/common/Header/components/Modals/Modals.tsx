'use client';

import { SignUpModal } from '@/components/modals/SignUpModal/SignUpModal';
import { SignInModal } from '@/components/modals/SignInModal';

type ModalsProps = {
  isSignUpModalOpen: boolean;
  setIsSignUpModalOpen: (open: boolean) => void;
  isSignInModalOpen: boolean;
  setIsSignInModalOpen: (open: boolean) => void;
  handleSignUpClick: () => void;
  handleSignInClick: () => void;
  handleSignUpModalClose: () => void;
  handleSignInModalClose: () => void;
};

export function Modals({
  isSignUpModalOpen,
  setIsSignUpModalOpen,
  isSignInModalOpen,
  setIsSignInModalOpen,
  handleSignUpClick,
  handleSignInClick,
  handleSignUpModalClose,
  handleSignInModalClose,
}: ModalsProps) {
  return (
    <>
      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onOpenChange={setIsSignUpModalOpen}
        onSignInClick={handleSignInClick}
        onSuccess={handleSignUpModalClose}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
        onSignUpClick={handleSignUpClick}
        onSuccess={handleSignInModalClose}
      />
    </>
  );
}
