'use client';

import { ForgotPasswordFormContent } from './components/ForgotPasswordFormContent';
import { ForgotPasswordFormValues } from './schema';
import { useForgotPasswordForm } from './useForgotPasswordForm';

export type ForgotPasswordFormProps = {
  onSubmit: (data: ForgotPasswordFormValues) => void;
  onCancel: () => void;
  className?: string;
};

export function ForgotPasswordForm({
  onSubmit,
  onCancel,
  className = '',
}: ForgotPasswordFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useForgotPasswordForm({
    onSubmit,
  });

  return (
    <div className={className}>
      <ForgotPasswordFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
