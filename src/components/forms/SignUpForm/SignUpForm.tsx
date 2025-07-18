'use client';

import { SignUpFormContent } from './components/SignUpFormContent';
import { SignUpFormValues } from './schema';
import { useSignUpForm } from './useSignUpForm';

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
    redirectTo
  });

  return (
    <div className={className}>
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
