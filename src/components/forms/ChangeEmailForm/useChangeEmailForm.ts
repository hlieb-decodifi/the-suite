'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangeEmailFormValues, createChangeEmailSchema } from './schema';
import { updateEmailAction } from '@/api/auth/actions';
import { toast } from '@/components/ui/use-toast';

export type UseChangeEmailFormProps = {
  onSubmit: (data: ChangeEmailFormValues) => void;
  defaultValues?: Partial<ChangeEmailFormValues>;
  currentEmail?: string | undefined;
};

export function useChangeEmailForm({
  onSubmit,
  defaultValues,
  currentEmail,
}: UseChangeEmailFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(createChangeEmailSchema(currentEmail)),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
      currentPassword: '',
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback(
    async (data: ChangeEmailFormValues) => {
      try {
        setIsPending(true);

        // Call the server action for email change
        const result = await updateEmailAction(
          data.newEmail,
          data.currentPassword,
        );

        if (!result.success) {
          toast({
            variant: 'destructive',
            title: 'Email change failed',
            description: result.error || 'Failed to change email',
          });
          return;
        }

        // Call the onSubmit callback passed from parent
        onSubmit(data);

        toast({
          title: 'Email change initiated',
          description:
            'Please check your current email address to confirm the change.',
        });

        // Reset form
        form.reset();
      } catch (error) {
        console.error('Error submitting form:', error);
        toast({
          variant: 'destructive',
          title: 'Email change failed',
          description: 'Failed to change email. Please try again.',
        });
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit, form],
  );

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
}
