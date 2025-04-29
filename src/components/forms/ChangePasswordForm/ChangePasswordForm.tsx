'use client';

import { FormField } from '@/components/ui/form';
import { PasswordInput } from '../components/PasswordInput';
import { Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Control } from 'react-hook-form';
import { useState } from 'react';
import { changePasswordAction } from '@/api/auth/actions';
import { Typography } from '@/components/ui/typography';
import { changePasswordSchema, ChangePasswordFormValues } from './schema';
import { FormButtons } from '../components/FormButtons';

export type ChangePasswordFormProps = {
  onSubmit: () => void;
  onCancel?: () => void;
  className?: string;
};

// Extracted component for form fields to reduce main component line count
function PasswordFormFields({
  control,
}: {
  control: Control<ChangePasswordFormValues>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="currentPassword"
        render={({ field }) => (
          <PasswordInput
            label="Current Password"
            placeholder="Enter your current password"
            {...field}
          />
        )}
      />

      <FormField
        control={control}
        name="newPassword"
        render={({ field }) => (
          <PasswordInput
            label="New Password"
            placeholder="Enter your new password"
            {...field}
          />
        )}
      />

      <FormField
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm your new password"
            {...field}
          />
        )}
      />
    </>
  );
}

export function ChangePasswordForm({
  onSubmit,
  onCancel,
  className = '',
}: ChangePasswordFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (data: ChangePasswordFormValues) => {
    setIsPending(true);
    setError(null);

    try {
      const result = await changePasswordAction(
        data.currentPassword,
        data.newPassword,
      );

      if (!result.success) {
        setError(result.error || 'Failed to change password');
        setIsPending(false);
        return;
      }

      onSubmit();
    } catch (error) {
      console.error('Error changing password:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <Typography variant="small" className="text-red-500">
              {error}
            </Typography>
          )}

          <PasswordFormFields control={form.control} />

          <FormButtons
            submitText="Change Password"
            cancelText="Cancel"
            onCancel={onCancel || (() => {})}
            isPending={isPending}
            saveSuccess={false}
          />
        </form>
      </Form>
    </div>
  );
}
