'use client';

import { SignUpForm } from '@/components/forms/SignUpForm';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '../Modal';

type SignUpModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInClick?: () => void;
  onSuccess?: () => void;
  redirectToDashboard?: boolean;
  redirectTo?: string;
};

export function SignUpModal({
  isOpen,
  onOpenChange,
  onSignInClick,
  onSuccess,
  redirectToDashboard = false,
  redirectTo = '/profile',
}: SignUpModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    onOpenChange(false);

    // Reset form state when modal is closed
    setTimeout(() => {
      if (!isOpen) {
        setIsSubmitted(false);
      }
    }, 300);

    // If we've submitted the form successfully and want to redirect, go to dashboard
    if (isSubmitted && redirectToDashboard) {
      router.push('/profile');
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);

    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSignInClick = () => {
    handleClose();
    if (onSignInClick) {
      onSignInClick();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
      hideCloseButton
      title="Create an account"
    >
      <SignUpForm
        onSubmit={handleSubmit}
        onLoginClick={handleSignInClick}
        className="w-full"
        redirectToDashboard={redirectToDashboard}
        redirectTo={redirectTo}
      />
    </Modal>
  );
}
