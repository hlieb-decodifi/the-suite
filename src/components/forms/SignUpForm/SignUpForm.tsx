'use client';

import { SignUpFormContent } from './components/SignUpFormContent';
import { SignUpFormValues } from './schema';
import { useSignUpForm } from './useSignUpForm';

export type SignUpFormProps = {
  onSubmit: (data: SignUpFormValues) => void;
  onLoginClick?: () => void;
  className?: string;
  redirectToDashboard?: boolean;
};

export function SignUpForm({
  onSubmit,
  onLoginClick,
  className = '',
  redirectToDashboard = false,
}: SignUpFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignUpForm({
    onSubmit,
    redirectToDashboard,
  });

  return (
    <div className={className}>
      <SignUpFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        onLoginClick={onLoginClick!}
      />
    </div>
  );
}
