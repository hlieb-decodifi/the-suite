'use client';

import { FormField } from '@/components/ui/form';
import { FormInput } from '../components/FormInput';
import { PasswordInput } from '../components/PasswordInput';
import { Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Control } from 'react-hook-form';
import { useState } from 'react';
import { updateEmailAction } from '@/api/auth/actions';
import { Typography } from '@/components/ui/typography';
import { updateEmailSchema, UpdateEmailFormValues } from './schema';
import { FormButtons } from '../components/FormButtons';

export type UpdateEmailFormProps = {
  onSubmit: () => void;
  onCancel?: () => void;
  className?: string;
  currentEmail?: string | undefined;
};

// Extracted component for form fields to reduce main component line count
function EmailFormFields({
  control,
}: {
  control: Control<UpdateEmailFormValues>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="newEmail"
        render={({ field }) => (
          <FormInput
            label="New Email"
            placeholder="Enter your new email address"
            {...field}
          />
        )}
      />

      <FormField
        control={control}
        name="confirmEmail"
        render={({ field }) => (
          <FormInput
            label="Confirm Email"
            placeholder="Confirm your new email address"
            {...field}
          />
        )}
      />

      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <PasswordInput
            label="Password"
            placeholder="Enter your password to confirm"
            {...field}
          />
        )}
      />
    </>
  );
}

export function UpdateEmailForm({
  onSubmit,
  onCancel,
  className = '',
  currentEmail = '',
}: UpdateEmailFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdateEmailFormValues>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
      password: '',
    },
  });

  const handleSubmit = async (data: UpdateEmailFormValues) => {
    setIsPending(true);
    setError(null);

    try {
      const result = await updateEmailAction(data.newEmail, data.password);

      if (!result.success) {
        setError(result.error || 'Failed to update email');
        setIsPending(false);
        return;
      }

      onSubmit();
    } catch (error) {
      console.error('Error updating email:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      {currentEmail && (
        <div className="mb-4">
          <Typography variant="small" className="text-muted-foreground">
            Current email: {currentEmail}
          </Typography>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <Typography variant="small" className="text-red-500">
              {error}
            </Typography>
          )}

          <EmailFormFields control={form.control} />

          <FormButtons
            submitText="Update Email"
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
