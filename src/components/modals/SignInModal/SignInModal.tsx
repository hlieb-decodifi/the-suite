'use client';

import { SignInForm } from '@/components/forms/SignInForm';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleAccountModal } from '@/components/forms/components/GoogleAccountModal/GoogleAccountModal';
import { useState } from 'react';
import { ForgotPasswordModal } from '../ForgotPasswordModal';
import { Modal } from '../Modal';

type SignInModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignUpClick?: () => void;
  onForgotPasswordClick?: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
};

export function SignInModal({
  isOpen,
  onOpenChange,
  onSignUpClick,
  onForgotPasswordClick,
  onSuccess,
  redirectTo = '/profile',
}: SignInModalProps) {
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  const googleError = searchParams?.get('googleError');
  const email = searchParams?.get('email') || '';
  const showModal = googleError === 'no_account' && email;

  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const currentParams = searchParams
    ? new URLSearchParams(searchParams.toString())
    : new URLSearchParams();

  const handleGoogleSecondary = () => {
    currentParams.set('email', email);
    currentParams.delete('googleError');
    router.replace(`${pathname}?${currentParams.toString()}`);
    setModalOpen(false);
    if (onSignUpClick) onSignUpClick();
  };

  const handleGoogleClose = () => {
    setModalOpen(false);
    currentParams.delete('googleError');
    currentParams.delete('email');
    router.replace(
      `${pathname}${currentParams.toString() ? '?' + currentParams.toString() : ''}`,
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleForgotPasswordClick = () => {
    // If external handler is provided, use it
    if (onForgotPasswordClick) {
      onForgotPasswordClick();
    } else {
      // Otherwise use the internal implementation
      onOpenChange(false);
      setIsForgotPasswordOpen(true);
    }
  };

  const handleReturnToLogin = () => {
    setIsForgotPasswordOpen(false);
    onOpenChange(true);
  };

  return (
    <>
      {showModal && modalOpen && (
        <GoogleAccountModal
          open={modalOpen}
          mode="signin"
          email={email}
          onSecondary={handleGoogleSecondary}
          onClose={handleGoogleClose}
        />
      )}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
        hideCloseButton
        title="Log in"
      >
        <SignInForm
          onSubmit={handleSubmit}
          onSignUpClick={() => {
            handleClose();
            if (onSignUpClick) onSignUpClick();
          }}
          onForgotPasswordClick={handleForgotPasswordClick}
          className="w-full"
          redirectTo={redirectTo}
        />
      </Modal>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
        onLoginClick={handleReturnToLogin}
      />
    </>
  );
}
