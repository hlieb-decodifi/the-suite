'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordFormValues, forgotPasswordSchema } from './schema';

export type UseForgotPasswordFormProps = {
  onSubmit: (data: ForgotPasswordFormValues) => void;
  defaultValues?: Partial<ForgotPasswordFormValues>;
};

export function useForgotPasswordForm({ 
  onSubmit, 
  defaultValues 
}: UseForgotPasswordFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setIsPending(true);
      
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsPending(false);
    }
  };

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 