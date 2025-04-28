'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormValues, signInSchema } from './schema';
import { signInAction } from '@/api/auth/actions';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export type UseSignInFormProps = {
  onSubmit: (data: SignInFormValues) => void;
  defaultValues?: Partial<SignInFormValues>;
  redirectTo?: string;
};

export function useSignInForm({ 
  onSubmit, 
  defaultValues,
  redirectTo = '/dashboard'
}: UseSignInFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback(async (data: SignInFormValues) => {
    try {
      setIsPending(true);
      
      // Call the server action for sign in
      const result = await signInAction(data);
      
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: result.error || "Invalid email or password"
        });
        return;
      }
      
      // Call the onSubmit callback passed from parent
      onSubmit(data);
      
      toast({
        title: "Signed in successfully",
        description: "Welcome back!"
      });
      
      // Redirect to the specified page
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "Failed to sign in. Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }, [onSubmit, router, redirectTo]);

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 