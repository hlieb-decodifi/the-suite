import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  FormFieldWrapper,
  FormInput,
  FormTextarea,
} from '@/components/forms/common';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useHeaderForm } from './useHeaderForm';
import { HeaderFormValues } from './schema';
import { Typography } from '@/components/ui/typography';
import { forwardRef, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

export type HeaderFormProps = {
  onSubmitSuccess: (data: HeaderFormValues) => Promise<void> | void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
  defaultValues?: Partial<HeaderFormValues> | undefined;
  hideButtons?: boolean;
};

export const HeaderForm = forwardRef<HTMLFormElement, HeaderFormProps>(
  function HeaderForm(
    {
      onSubmitSuccess,
      onCancel,
      onPendingChange,
      defaultValues,
      hideButtons = false,
    },
    ref,
  ) {
    const {
      form,
      isPending,
      onSubmit: handleFormSubmit,
    }: {
      form: UseFormReturn<HeaderFormValues>;
      isPending: boolean;
      onSubmit: (data: HeaderFormValues) => Promise<void>;
    } = useHeaderForm({
      onSubmit: onSubmitSuccess,
      defaultValues,
    });

    // Wrapper to normalize phoneNumber before calling onSubmitSuccess
    const handlePhoneNumberSubmit = async (data: HeaderFormValues) => {
      let phoneNumber = data.phoneNumber;
      if (phoneNumber && /^\+\d{1,4}$/.test(phoneNumber.trim())) {
        phoneNumber = undefined;
      }
      await handleFormSubmit({ ...data, phoneNumber });
    };

    // Notify parent of pending state changes
    useEffect(() => {
      if (onPendingChange) {
        onPendingChange(isPending);
      }
    }, [isPending, onPendingChange]);

    return (
      <Form {...form}>
        <form
          ref={ref}
          onSubmit={form.handleSubmit(handlePhoneNumberSubmit)}
          noValidate
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormFieldWrapper
              control={form.control}
              name="firstName"
              label="First Name"
            >
              {(field) => (
                <FormInput
                  placeholder="e.g., John"
                  {...field}
                  value={(field.value as string) ?? ''}
                />
              )}
            </FormFieldWrapper>
            <FormFieldWrapper
              control={form.control}
              name="lastName"
              label="Last Name"
            >
              {(field) => (
                <FormInput
                  placeholder="e.g., Smith"
                  {...field}
                  value={(field.value as string) ?? ''}
                />
              )}
            </FormFieldWrapper>
          </div>

          <FormFieldWrapper
            control={form.control}
            name="profession"
            label="Title"
          >
            {(field) => (
              <FormInput
                placeholder="e.g., Hair Stylist"
                {...field}
                value={(field.value as string) ?? ''}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="phoneNumber"
            label="Phone Number (Optional)"
          >
            {(field) => (
              <PhoneInput
                defaultCountry="us"
                value={field.value || ''}
                onChange={(value) => {
                  // Clear phone errors when user types
                  form.clearErrors('phoneNumber');
                  field.onChange(value);
                }}
                inputClassName={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus:ring-primary ${
                  form.formState.errors.phoneNumber
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-border focus:border-primary'
                }`}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="description"
            label="Bio / Description"
          >
            {(field) => (
              <FormTextarea
                placeholder="Tell clients about yourself and your services..."
                rows={4}
                maxLength={500} // Match schema validation
                {...field}
                value={(field.value as string) ?? ''}
              />
            )}
          </FormFieldWrapper>

          {/* Social Media Links - Replaced with specific fields */}
          <div className="space-y-3 pt-2">
            <Typography variant="h4" className="text-sm font-medium mb-3">
              Social Media Links (Optional)
            </Typography>
            <FormFieldWrapper
              control={form.control}
              name="instagramUrl"
              label="Instagram URL"
            >
              {(field) => (
                <FormInput
                  placeholder="https://instagram.com/username"
                  {...field}
                  value={(field.value as string) ?? ''}
                />
              )}
            </FormFieldWrapper>
            <FormFieldWrapper
              control={form.control}
              name="facebookUrl"
              label="Facebook URL"
            >
              {(field) => (
                <FormInput
                  placeholder="https://facebook.com/username"
                  {...field}
                  value={(field.value as string) ?? ''}
                />
              )}
            </FormFieldWrapper>
            <FormFieldWrapper
              control={form.control}
              name="tiktokUrl"
              label="TikTok URL"
            >
              {(field) => (
                <FormInput
                  placeholder="https://tiktok.com/@username"
                  {...field}
                  value={(field.value as string) ?? ''}
                />
              )}
            </FormFieldWrapper>
          </div>

          {/* Server Error Display */}
          {form.formState.errors.root?.serverError && (
            <Typography variant="small" className="text-destructive">
              {form.formState.errors.root.serverError.message}
            </Typography>
          )}

          {/* Action Buttons - Only show if not hidden */}
          {!hideButtons && onCancel && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </Form>
    );
  },
);
