import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { headerSchema, HeaderFormValues } from './schema';
import { useCallback, useState } from 'react';
import type { Resolver } from 'react-hook-form';

export type UseHeaderFormProps = {
  onSubmit: (data: HeaderFormValues) => Promise<void> | void;
  defaultValues?: Partial<HeaderFormValues> | undefined;
};

export function useHeaderForm({
  onSubmit,
  defaultValues,
}: UseHeaderFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<HeaderFormValues>({
    resolver: zodResolver(headerSchema) as Resolver<HeaderFormValues>,
    defaultValues: {
      firstName: '',
      lastName: '',
      profession: '',
      description: '',
      phoneNumber: '',
      twitterUrl: undefined,
      facebookUrl: undefined,
      tiktokUrl: undefined,
      ...defaultValues
    },
    mode: 'onBlur',
  });

  const handleSubmit = useCallback(
    async (data: HeaderFormValues) => {
      setIsPending(true);
      // Ensure empty string phone number is treated as undefined before submitting
      // The URL preprocessing is handled by the schema itself
      const submitData = {
        ...data,
        phoneNumber: data.phoneNumber === '' ? undefined : data.phoneNumber,
      };
      try {
        await onSubmit(submitData);
      } catch (err) {
        console.error('Submission failed:', err);
        // Example: Set a form-level error
        form.setError('root.serverError', {
          type: 'manual',
          message: 'Failed to save header information. Please try again.',
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