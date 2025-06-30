'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordFormValues, resetPasswordSchema } from './schema';

export type UseResetPasswordFormProps = {
  onSubmit: (data: ResetPasswordFormValues) => void;
  defaultValues?: Partial<ResetPasswordFormValues>;
  isLoading?: boolean;
};

export function useResetPasswordForm({ 
  onSubmit, 
  defaultValues,
  isLoading = false
}: UseResetPasswordFormProps) {
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: ResetPasswordFormValues) => {
    onSubmit(data);
  };

  return {
    form,
    isPending: isLoading,
    onSubmit: handleSubmit,
  };
} 