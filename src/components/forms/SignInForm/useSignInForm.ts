'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormValues, signInSchema } from './schema';
import { signInAction } from '@/api/auth/actions';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export type UseSignInFormProps = {
  onSubmit: (data: SignInFormValues) => void;
  defaultValues?: Partial<SignInFormValues>;
  redirectTo?: string;
};

export function useSignInForm({ 
  onSubmit, 
  defaultValues,
  redirectTo = '/profile'
}: UseSignInFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();

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
      
      // Update the auth store with user and session data
      if (result.user) setUser(result.user);
      if (result.session) setSession(result.session);
      
      // Call the onSubmit callback passed from parent
      onSubmit(data);
      
      toast({
        title: "Signed in successfully",
        description: "Welcome back!"
      });
      
      // Redirect based on admin status
      if (result.isAdmin) {
        router.push('/admin');
        return;
      }
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
  }, [onSubmit, router, redirectTo, setUser, setSession]);

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 