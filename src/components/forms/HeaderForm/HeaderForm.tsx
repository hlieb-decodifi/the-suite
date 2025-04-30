import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  FormFieldWrapper,
  FormInput,
  FormTextarea,
} from '@/components/forms/common';
import { useHeaderForm } from './useHeaderForm';
import { HeaderFormValues } from './schema';
import { Typography } from '@/components/ui/typography';

export type HeaderFormProps = {
  onSubmitSuccess: (data: HeaderFormValues) => Promise<void> | void;
  onCancel: () => void;
  defaultValues?: Partial<HeaderFormValues> | undefined;
};

export function HeaderForm({
  onSubmitSuccess,
  onCancel,
  defaultValues,
}: HeaderFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleFormSubmit,
  } = useHeaderForm({
    onSubmit: onSubmitSuccess,
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
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
          label="Profession"
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
            <FormInput
              type="tel"
              placeholder="+1234567890" // E.164 format example
              {...field}
              value={(field.value as string) ?? ''}
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
            name="twitterUrl"
            label="Twitter / X URL"
          >
            {(field) => (
              <FormInput
                placeholder="https://twitter.com/username"
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

        {/* Action Buttons */}
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
      </form>
    </Form>
  );
}
