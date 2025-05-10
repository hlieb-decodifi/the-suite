'use client';

import { FormInput, PasswordInput } from '@/components/forms/components';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { SignInFormValues } from '../schema';

type SignInFormContentProps = {
  form: UseFormReturn<SignInFormValues>;
  isPending: boolean;
  onSubmit: (data: SignInFormValues) => void;
  onSignUpClick: () => void;
  onForgotPasswordClick?: () => void;
};

export function SignInFormContent({
  form,
  isPending,
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
}: SignInFormContentProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="w-full">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormInput
          id="email"
          label="Email"
          type="email"
          placeholder="Enter your email address"
          {...register('email')}
          hasError={!!errors.email}
          error={errors.email?.message}
        />

        <div className="space-y-1">
          <PasswordInput
            id="password"
            label="Password"
            placeholder="Enter your password"
            {...register('password')}
            hasError={!!errors.password}
            error={errors.password?.message}
          />

          {onForgotPasswordClick && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-primary text-sm font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full px-8 font-futura text-lg font-bold"
            disabled={isPending}
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>

        <div className="text-center pt-2">
          <span className="text-sm text-muted-foreground">
            Not registered yet?
          </span>{' '}
          <button
            type="button"
            onClick={onSignUpClick}
            className="text-primary font-medium hover:underline text-sm"
          >
            Create an account
          </button>
        </div>
      </form>
    </div>
  );
}
