'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpFormValues, signUpSchema } from './schema';
import { toast } from '@/components/ui/use-toast';
import { signUpAction } from '@/api/auth/actions';
import { useRouter } from 'next/navigation';

export type UseSignUpFormProps = {
  onSubmit: (data: SignUpFormValues) => void;
  defaultValues?: Partial<SignUpFormValues>;
  redirectToDashboard?: boolean;
};

export function useSignUpForm({ 
  onSubmit, 
  defaultValues,
  redirectToDashboard = false
}: UseSignUpFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

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

  const handleSubmit = useCallback(async (data: SignUpFormValues) => {
    try {
      setIsPending(true);
      
      // Call the server action for signup
      const result = await signUpAction(data);
      
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: result.error
        });
        return;
      }
      
      // Call the onSubmit callback passed from parent
      onSubmit(data);
      
      toast({
        title: "Account created",
        description: "Please check your email to confirm your account."
      });
      
      // Redirect based on the redirectToDashboard flag
      if (redirectToDashboard) {
        router.push('/dashboard');
      } else {
      router.push(`/auth/email-verification?email=${encodeURIComponent(data.email)}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: "Failed to create account. Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }, [onSubmit, router, redirectToDashboard]);

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 