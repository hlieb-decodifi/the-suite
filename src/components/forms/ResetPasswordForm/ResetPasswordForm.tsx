'use client';

import { ResetPasswordFormContent } from './components/ResetPasswordFormContent';
import { ResetPasswordFormValues } from './schema';
import { useResetPasswordForm } from './useResetPasswordForm';

export type ResetPasswordFormProps = {
  onSubmit: (data: ResetPasswordFormValues, accessToken?: string | null, refreshToken?: string | null) => Promise<void>;
  className?: string;
  isLoading?: boolean;
  userEmail?: string | undefined;
};

export function ResetPasswordForm({
  onSubmit,
  className = '',
  isLoading = false,
  userEmail,
}: ResetPasswordFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useResetPasswordForm({
    onSubmit,
    isLoading,
  });

  return (
    <div className={className}>
      <ResetPasswordFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        userEmail={userEmail}
      />
    </div>
  );
}
