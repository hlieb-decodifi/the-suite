'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpFormValues, signUpSchema } from './schema';

export type UseSignUpFormProps = {
  onSubmit: (data: SignUpFormValues) => void;
  defaultValues?: Partial<SignUpFormValues>;
};

export function useSignUpForm({ onSubmit, defaultValues }: UseSignUpFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: SignUpFormValues) => {
    try {
      setIsPending(true);
      
      // You would typically make an API call here
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
      // You can handle form errors here
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