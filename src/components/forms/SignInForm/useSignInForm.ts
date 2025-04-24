'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormValues, signInSchema } from './schema';

export type UseSignInFormProps = {
  onSubmit: (data: SignInFormValues) => void;
  defaultValues?: Partial<SignInFormValues>;
};

export function useSignInForm({ onSubmit, defaultValues }: UseSignInFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: SignInFormValues) => {
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