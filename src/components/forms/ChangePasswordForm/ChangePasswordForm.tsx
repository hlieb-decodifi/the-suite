'use client';

import { ChangePasswordFormContent } from './components/ChangePasswordFormContent';
import { ChangePasswordFormValues } from './schema';
import { useChangePasswordForm } from './useChangePasswordForm';

export type ChangePasswordFormProps = {
  onSubmit: (data: ChangePasswordFormValues) => void;
  className?: string;
};

export function ChangePasswordForm({
  onSubmit,
  className = '',
}: ChangePasswordFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useChangePasswordForm({
    onSubmit,
  });

  return (
    <div className={className}>
      <ChangePasswordFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
