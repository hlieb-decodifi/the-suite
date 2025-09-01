'use client';


import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SignInFormContent } from './components/SignInFormContent';
import { SignInFormValues } from './schema';
import { useSignInForm } from './useSignInForm';
import { GoogleAccountModal } from '../components/GoogleAccountModal/GoogleAccountModal';

export type SignInFormProps = {
  onSubmit: (data: SignInFormValues) => void;
  onSignUpClick?: () => void;
  onForgotPasswordClick?: () => void;
  className?: string;
  redirectTo?: string;
};

export function SignInForm({
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  className = '',
  redirectTo = '/profile',
}: SignInFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignInForm({
    onSubmit,
    redirectTo,
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  const googleError = searchParams?.get('googleError');
  const email = searchParams?.get('email') || '';

  const showModal = googleError === 'no_account' && email;


  const handleSecondary = () => {
    // Switch to signup form, pre-fill email
    router.replace(`/signup?email=${encodeURIComponent(email)}`);
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
          mode="signin"
          email={email}
          onSecondary={handleSecondary}
          onClose={handleClose}
        />
      )}
      <SignInFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        onSignUpClick={onSignUpClick || (() => {})}
        onForgotPasswordClick={onForgotPasswordClick || (() => {})}
        redirectTo={redirectTo}
      />
    </div>
  );
}
