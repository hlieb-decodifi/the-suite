'use client';

import { Button } from '@/components/ui/button';
import { useSignUpForm } from './useSignUpForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpFormValues, signUpSchema } from './schema';
import { SignUpFormProps } from './types';
import { FormInput } from '../components';

export function SignUpForm({ className = '' }: SignUpFormProps) {
  const { defaultValues, onSubmit, isPending } = useSignUpForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues,
  });

  return (
    <form
      className={`space-y-1.5 ${className}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormInput
        id="full_name"
        label="Full Name"
        type="text"
        placeholder="John Doe"
        {...register('full_name')}
        hasError={!!errors.full_name}
        error={errors.full_name?.message}
        aria-invalid={!!errors.full_name}
      />

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
        {isPending ? 'Signing up...' : 'Sign Up'}
      </Button>
    </form>
  );
}
