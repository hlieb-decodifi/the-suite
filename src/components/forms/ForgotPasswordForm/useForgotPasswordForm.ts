'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordFormValues, forgotPasswordSchema } from './schema';

export type UseForgotPasswordFormProps = {
  onSubmit: (data: ForgotPasswordFormValues) => void;
  defaultValues?: Partial<ForgotPasswordFormValues>;
  isLoading?: boolean;
};

export function useForgotPasswordForm({ 
  onSubmit, 
  defaultValues,
  isLoading = false
}: UseForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
      onSubmit(data);
  };

  return {
    form,
    isPending: isLoading,
    onSubmit: handleSubmit,
  };
} 