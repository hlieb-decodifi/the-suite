'use client';

import { SignInFormContent } from './components/SignInFormContent';
import { SignInFormValues } from './schema';
import { useSignInForm } from './useSignInForm';

export type SignInFormProps = {
  onSubmit: (data: SignInFormValues) => void;
  onSignUpClick?: () => void;
  onForgotPasswordClick?: () => void;
  className?: string;
};

export function SignInForm({
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  className = '',
}: SignInFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignInForm({
    onSubmit,
  });

  return (
    <div className={className}>
      <SignInFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        onSignUpClick={onSignUpClick || (() => {})}
        onForgotPasswordClick={onForgotPasswordClick || (() => {})}
      />
    </div>
  );
}
