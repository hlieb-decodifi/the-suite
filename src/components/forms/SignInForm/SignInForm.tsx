'use client';

import { Button } from '@/components/ui/button';
import { useSignInForm } from './useSignInForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormValues, signInSchema } from './schema';
import { SignInFormProps } from './types';
import { FormInput } from '../components';

export function SignInForm({ className = '' }: SignInFormProps) {
  const { defaultValues, onSubmit, isPending } = useSignInForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues,
  });

  return (
    <form
      className={`space-y-1.5 ${className}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormInput
        id="email"
        label="Email"
        type="email"
        placeholder="name@example.com"
        {...register('email')}
        hasError={!!errors.email}
        error={errors.email?.message}
        aria-invalid={!!errors.email}
      />

      <FormInput
        id="password"
        label="Password"
        type="password"
        {...register('password')}
        hasError={!!errors.password}
        error={errors.password?.message}
        aria-invalid={!!errors.password}
      />

      <Button type="submit" className="w-full mt-2" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
