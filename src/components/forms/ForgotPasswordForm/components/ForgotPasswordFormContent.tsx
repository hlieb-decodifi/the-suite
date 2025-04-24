'use client';

import { FormInput } from '@/components/forms/components';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { ForgotPasswordFormValues } from '../schema';

type ForgotPasswordFormContentProps = {
  form: UseFormReturn<ForgotPasswordFormValues>;
  isPending: boolean;
  onSubmit: (data: ForgotPasswordFormValues) => void;
  onCancel: () => void;
};

export function ForgotPasswordFormContent({
  form,
  isPending,
  onSubmit,
  onCancel,
}: ForgotPasswordFormContentProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="w-full">
      <p className="text-center text-muted-foreground mb-6">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          id="email"
          label="Email"
          type="email"
          placeholder="Enter your email address"
          {...register('email')}
          hasError={!!errors.email}
          error={errors.email?.message}
        />

        <div className="pt-4 space-y-3">
          <Button
            type="submit"
            className="w-full px-8 font-futura text-lg font-bold"
            disabled={isPending}
          >
            {isPending ? 'Sending...' : 'Send reset link'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full font-futura font-medium"
          >
            Back to login
          </Button>
        </div>
      </form>
    </div>
  );
}
