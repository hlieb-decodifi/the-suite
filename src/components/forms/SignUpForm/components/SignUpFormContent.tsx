'use client';

import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/components';
import { SignUpFormValues } from '../schema';
import { UseFormReturn } from 'react-hook-form';
import { UserTypesFields } from './UserTypesFields';
import { NameFields } from './NameFields';
import { PasswordField } from './PasswordField';

type SignUpFormContentProps = {
  form: UseFormReturn<SignUpFormValues>;
  isPending: boolean;
  onSubmit: (data: SignUpFormValues) => void;
  onLoginClick?: () => void;
};

export function SignUpFormContent({
  form,
  isPending,
  onSubmit,
  onLoginClick,
}: SignUpFormContentProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <NameFields register={register} errors={errors} />

      {/* Email and Password in one row on desktop, column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <FormInput
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email address"
            {...register('email')}
            hasError={!!errors.email}
            error={errors.email?.message}
          />
        </div>

        <div className="col-span-1">
          <PasswordField register={register} errors={errors} />
        </div>
      </div>

      <div className="mt-2">
        <UserTypesFields errors={errors} control={control} />
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="w-full px-8 font-futura text-lg font-bold"
          disabled={isPending}
        >
          {isPending ? 'Signing up...' : 'Sign up'}
        </Button>
      </div>

      {onLoginClick && (
        <div className="text-center pt-2">
          <span className="text-sm text-muted-foreground">
            I am registered!
          </span>{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-primary font-medium hover:underline text-sm"
          >
            Log in
          </button>
        </div>
      )}
    </form>
  );
}
