'use client';

import { SignInFormContent } from './components/SignInFormContent';
import { SignInFormValues } from './schema';
import { useSignInForm } from './useSignInForm';

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

  return (
    <div className={className}>
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
