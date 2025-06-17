'use client';

import { UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import {
  FormFieldWrapper,
  FormInput,
  FormPasswordInput,
} from '@/components/forms/common';
import { ChangeEmailFormValues } from '../schema';

type ChangeEmailFormContentProps = {
  form: UseFormReturn<ChangeEmailFormValues>;
  isPending: boolean;
  onSubmit: (data: ChangeEmailFormValues) => void;
  currentEmail?: string | undefined;
};

export function ChangeEmailFormContent({
  form,
  isPending,
  onSubmit,
  currentEmail,
}: ChangeEmailFormContentProps) {
  return (
    <div className="w-full">
      {currentEmail && (
        <div className="mb-6 p-3 bg-muted rounded-md">
          <Typography variant="small" className="text-muted-foreground">
            Current email: <span className="font-medium">{currentEmail}</span>
          </Typography>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <FormFieldWrapper
            control={form.control}
            name="newEmail"
            label="New Email Address"
          >
            {(field) => (
              <FormInput
                {...field}
                type="email"
                placeholder="Enter your new email address"
                autoComplete="email"
                autoFocus={false}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="confirmEmail"
            label="Confirm New Email"
          >
            {(field) => (
              <FormInput
                {...field}
                type="email"
                placeholder="Confirm your new email address"
                autoComplete="email"
              />
            )}
          </FormFieldWrapper>

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
              />
            )}
          </FormFieldWrapper>

          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[120px]"
            >
              {isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
