'use client';

import { Button } from '@/components/ui/button';
import { FormFieldWrapper, FormPasswordInput } from '@/components/forms/common';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { ResetPasswordFormValues } from '../schema';
import { Typography } from '@/components/ui/typography';

export type ResetPasswordFormContentProps = {
  form: UseFormReturn<ResetPasswordFormValues>;
  isPending: boolean;
  onSubmit: (data: ResetPasswordFormValues) => void;
  userEmail?: string | undefined;
};

export function ResetPasswordFormContent({
  form,
  isPending,
  onSubmit,
  userEmail,
}: ResetPasswordFormContentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Typography variant="h2" className="text-2xl font-bold">
          Reset Your Password
        </Typography>
        <Typography className="text-muted-foreground">
          {userEmail ? (
            <>
              Enter a new password for{' '}
              <span className="font-medium">{userEmail}</span>
            </>
          ) : (
            'Enter your new password below'
          )}
        </Typography>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormFieldWrapper
            control={form.control}
            name="password"
            label="New Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Enter your new password"
                disabled={isPending}
                autoComplete="new-password"
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="confirmPassword"
            label="Confirm New Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Confirm your new password"
                disabled={isPending}
                autoComplete="new-password"
              />
            )}
          </FormFieldWrapper>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            size="lg"
          >
            {isPending ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
