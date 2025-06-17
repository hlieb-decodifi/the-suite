'use client';

import { UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { FormFieldWrapper, FormPasswordInput } from '@/components/forms/common';
import { ChangePasswordFormValues } from '../schema';

type ChangePasswordFormContentProps = {
  form: UseFormReturn<ChangePasswordFormValues>;
  isPending: boolean;
  onSubmit: (data: ChangePasswordFormValues) => void;
};

export function ChangePasswordFormContent({
  form,
  isPending,
  onSubmit,
}: ChangePasswordFormContentProps) {
  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <FormFieldWrapper
            control={form.control}
            name="currentPassword"
            label="Current Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Enter your current password"
                autoComplete="current-password"
                autoFocus={false}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="newPassword"
            label="New Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Enter your new password"
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
                autoComplete="new-password"
              />
            )}
          </FormFieldWrapper>

          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[120px]"
            >
              {isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
