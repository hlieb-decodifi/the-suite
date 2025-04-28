'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import { SignInForm, SignInFormValues } from '@/components/forms/SignInForm';
import { SignInSuccess } from './components/SignInSuccess';
import { ForgotPasswordModal } from '../ForgotPasswordModal';

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
  redirectTo = '/dashboard',
}: SignInModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleClose = () => {
    onOpenChange(false);

    // Reset form state when modal is closed
    setTimeout(() => {
      if (!isOpen) {
        setIsSubmitted(false);
      }
    }, 300);
  };

  const handleSubmit = async (data: SignInFormValues) => {
    console.log('Sign in form submitted:', data);
    setIsSubmitted(true);

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
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
        hideCloseButton
        title={isSubmitted ? 'Log in successful' : 'Log in'}
      >
        {isSubmitted ? (
          <SignInSuccess onClose={handleClose} />
        ) : (
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
        )}
      </Modal>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
        onLoginClick={handleReturnToLogin}
      />
    </>
  );
}
