import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentMethodsSchema, PaymentMethodsFormValues } from './schema';
import { useCallback } from 'react';
import type { Resolver } from 'react-hook-form';

export type UsePaymentMethodsFormProps = {
  onSubmit: (data: PaymentMethodsFormValues) => void; // Keep void for simplicity now
  // defaultValues might be partial, keys are UUIDs
  defaultValues?: Partial<PaymentMethodsFormValues>;
};

export function usePaymentMethodsForm({
  onSubmit,
  defaultValues,
}: UsePaymentMethodsFormProps) {
  // isPending state is removed as it's handled by the parent via isSubmitting prop

  const form = useForm<PaymentMethodsFormValues>({
    resolver: zodResolver(paymentMethodsSchema) as Resolver<PaymentMethodsFormValues>,
    // Initialize with provided defaults. Missing keys will be implicitly undefined/false.
    defaultValues: defaultValues ?? {},
    mode: 'onChange', // Or 'onBlur' or 'onSubmit' as needed
  });

  // Reset logic might need adjustment if defaults change significantly after mount
  // useEffect(() => {
  //   form.reset(defaultValues ?? {});
  // }, [defaultValues, form]);

  // The submit handler remains largely the same
  const handleSubmit = useCallback(
    async (data: PaymentMethodsFormValues) => {
      try {
        await onSubmit(data);
        // No need to manage isPending here
      } catch (err) {
        console.error('PaymentMethodsForm submission failed:', err);
        // Optionally set a form error if the onSubmit promise rejects
        form.setError('root.serverError', {
          type: 'manual',
          message: 'Failed to save payment methods. Please try again.',
        });
      }
    },
    [onSubmit, form],
  );

  return {
    form,
    onSubmit: handleSubmit,
    // Removed isPending from return
  };
} 