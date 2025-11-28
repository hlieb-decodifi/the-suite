'use client';

import { SignUpForm } from '@/components/forms/SignUpForm';
import { useSearchParams } from 'next/navigation';
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

import { GoogleAccountModal } from '@/components/forms/components/GoogleAccountModal/GoogleAccountModal';

export function SignUpModal({
  isOpen,
  onOpenChange,
  onSignInClick,
  onSuccess,
  redirectToDashboard = false,
  redirectTo = '/profile',
}: SignUpModalProps) {
  const [modalOpen, setModalOpen] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const googleError = searchParams?.get('googleError');
  const email = searchParams?.get('email') || '';
  const showModal = googleError === 'account_exists' && email;

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
    if (onSignInClick) onSignInClick();
  };

  const handleGoogleClose = () => {
    setModalOpen(false);
    currentParams.delete('googleError');
    currentParams.delete('email');
    router.replace(
      `${pathname}${currentParams.toString() ? '?' + currentParams.toString() : ''}`,
    );
  };

  const handleSubmit = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSignInClick = () => {
    onOpenChange(false);
    if (onSignInClick) onSignInClick();
  };

  return (
    <>
      {showModal && modalOpen && (
        <GoogleAccountModal
          open={modalOpen}
          mode="signup"
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
    </>
  );
}
