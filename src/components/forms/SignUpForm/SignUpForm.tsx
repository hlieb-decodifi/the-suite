'use client';

import { SignUpFormContent } from './components/SignUpFormContent';
import { SignUpFormValues } from './schema';
import { useSignUpForm } from './useSignUpForm';

export type SignUpFormProps = {
  onSubmit: (data: SignUpFormValues) => void;
  onLoginClick?: () => void;
  className?: string;
};

export function SignUpForm({
  onSubmit,
  onLoginClick,
  className = '',
}: SignUpFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignUpForm({
    onSubmit,
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
