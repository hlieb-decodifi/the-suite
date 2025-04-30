import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  paymentMethodsSchema,
  PaymentMethodsFormValues,
} from './schema';

export type UsePaymentMethodsFormProps = {
  onSubmit: (data: PaymentMethodsFormValues) => Promise<void> | void;
  defaultValues?: Partial<PaymentMethodsFormValues> | undefined;
};

export function usePaymentMethodsForm({
  onSubmit,
  defaultValues,
}: UsePaymentMethodsFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<PaymentMethodsFormValues>({
    resolver: zodResolver(paymentMethodsSchema),
    // Provide defaults for the optional schema fields
    defaultValues: {
      creditCard: defaultValues?.creditCard ?? false,
      cash: defaultValues?.cash ?? false,
    },
  });

  const handleSubmit = useCallback(
    async (data: PaymentMethodsFormValues) => {
      setIsPending(true);
      try {
        // Pass data, ensuring defaults are handled if needed upstream
        await onSubmit({
          creditCard: data.creditCard ?? false,
          cash: data.cash ?? false,
        });
      } catch (err) {
        console.error('Submission failed:', err);
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit],
  );

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 