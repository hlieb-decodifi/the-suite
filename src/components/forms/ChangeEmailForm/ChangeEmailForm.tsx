'use client';

import { ChangeEmailFormContent } from './components/ChangeEmailFormContent';
import { ChangeEmailFormValues } from './schema';
import { useChangeEmailForm } from './useChangeEmailForm';

export type ChangeEmailFormProps = {
  onSubmit: (data: ChangeEmailFormValues) => void;
  className?: string;
  currentEmail?: string;
};

export function ChangeEmailForm({
  onSubmit,
  className = '',
  currentEmail,
}: ChangeEmailFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useChangeEmailForm({
    onSubmit,
    currentEmail,
  });

  return (
    <div className={className}>
      <ChangeEmailFormContent
        form={form}
        isPending={isPending}
        onSubmit={handleSubmit}
        currentEmail={currentEmail}
      />
    </div>
  );
}
