'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SignUpFormContent } from './components/SignUpFormContent';
import { SignUpFormValues } from './schema';
import { useSignUpForm } from './useSignUpForm';
import { GoogleAccountModal } from '../components/GoogleAccountModal/GoogleAccountModal';

export type SignUpFormProps = {
  onSubmit: (data: SignUpFormValues) => void;
  onLoginClick?: () => void;
  className?: string;
  redirectToDashboard?: boolean;
  redirectTo?: string;
};

export function SignUpForm({
  onSubmit,
  onLoginClick,
  className = '',
  redirectToDashboard = false,
  redirectTo = '/profile',
}: SignUpFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignUpForm({
    onSubmit,
    redirectToDashboard,
    redirectTo,
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  const googleError = searchParams?.get('googleError');
  const email = searchParams?.get('email') || '';

  const showModal = googleError === 'account_exists' && email;

  const handleSecondary = () => {
    // Switch to login form, pre-fill email
    router.replace(`/?email=${encodeURIComponent(email)}`);
    setModalOpen(false);
  };

  const handleClose = () => {
    setModalOpen(false);
    router.replace('/');
  };

  return (
    <div className={className}>
      {showModal && modalOpen && (
        <GoogleAccountModal
          open={modalOpen}
          mode="signup"
          email={email}
          onSecondary={handleSecondary}
          onClose={handleClose}
        />
      )}
      <SignUpFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        onLoginClick={onLoginClick!}
        redirectTo={redirectTo}
      />
    </div>
  );
}
