'use client';

import { UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { FormFieldWrapper, FormPasswordInput } from '@/components/forms/common';
import { SetPasswordFormValues } from './schema';

type SetPasswordFormContentProps = {
  form: UseFormReturn<SetPasswordFormValues>;
  isPending: boolean;
  onSubmit: (data: SetPasswordFormValues) => void;
};

export function SetPasswordFormContent({
  form,
  isPending,
  onSubmit,
}: SetPasswordFormContentProps) {
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
            name="newPassword"
            label="New Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Enter your new password"
                autoComplete="new-password"
                autoFocus={true}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="confirmPassword"
            label="Confirm Password"
          >
            {(field) => (
              <FormPasswordInput
                {...field}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
            )}
          </FormFieldWrapper>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            Set Password
          </Button>
        </form>
      </Form>
    </div>
  );
}
