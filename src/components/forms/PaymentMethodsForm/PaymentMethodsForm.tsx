import { useId } from 'react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography'; // For potential error message
import {
  FormFieldWrapper, // Use wrapper for structure, though label might be empty
  FormCheckbox,
} from '@/components/forms/common';
import { usePaymentMethodsForm } from './usePaymentMethodsForm';
import { PaymentMethodsFormValues, PAYMENT_METHODS } from './schema';

export type PaymentMethodsFormProps = {
  onSubmitSuccess: (data: PaymentMethodsFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<PaymentMethodsFormValues>;
};

export function PaymentMethodsForm({
  onSubmitSuccess,
  onCancel,
  defaultValues,
}: PaymentMethodsFormProps) {
  const formId = useId();
  const {
    form,
    isPending,
    onSubmit: handleFormSubmit,
  } = usePaymentMethodsForm({
    onSubmit: onSubmitSuccess, // Pass the success handler directly
    defaultValues,
  });

  // Check for the specific field error where the refinement message is attached
  const groupError = form.formState.errors.creditCard?.message;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-0.5" // Keep general spacing if needed
        noValidate
      >
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <FormFieldWrapper
              key={method.id}
              control={form.control}
              name={method.id as keyof PaymentMethodsFormValues}
              label="" // Label rendered by FormCheckbox
              showErrorMessage={false} // Keep hiding individual field messages
              className="h-6 space-y-0"
            >
              {(field) => (
                <FormCheckbox
                  field={field}
                  label={method.label}
                  id={`${formId}-${method.id}`}
                  labelClassName="text-md"
                />
              )}
            </FormFieldWrapper>
          ))}
        </div>

        {/* Display the group error message if present */}
        {groupError && (
          <Typography
            variant="small"
            className="absolute text-xs text-destructive -mt-2 mb-4"
          >
            {groupError}
          </Typography>
        )}

        {/* Buttons: Reduce top padding */}
        <div className="flex justify-end gap-2 pt-5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
