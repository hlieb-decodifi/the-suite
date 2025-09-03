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
  showHeadingAndDescription?: boolean;
};

export function ResetPasswordFormContent({
  form,
  isPending,
  onSubmit,
  userEmail,
  showHeadingAndDescription = true,
}: ResetPasswordFormContentProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      {showHeadingAndDescription && (
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
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
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
          </div>

          <div className="flex flex-col gap-2">
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
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
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
