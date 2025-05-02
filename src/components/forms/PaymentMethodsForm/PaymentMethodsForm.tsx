/* eslint-disable max-lines-per-function */
import {
  FormCheckbox,
  FormFieldWrapper, // Use wrapper for structure, though label might be empty
} from '@/components/forms/common';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Typography } from '@/components/ui/typography'; // For potential error message
import { useId } from 'react';
import { PaymentMethodsFormValues } from './schema';
import { usePaymentMethodsForm } from './usePaymentMethodsForm';
import { PaymentMethod } from '@/types/payment_methods';

export type PaymentMethodsFormProps = {
  onSubmitSuccess: (data: PaymentMethodsFormValues) => void;
  onCancel: () => void;
  availableMethods: PaymentMethod[]; // Add prop for available methods
  defaultValues?: Partial<PaymentMethodsFormValues>;
  isSubmitting?: boolean; // Add isSubmitting prop
};

export function PaymentMethodsForm({
  onSubmitSuccess,
  onCancel,
  availableMethods,
  defaultValues,
  isSubmitting, // Receive isSubmitting prop
}: PaymentMethodsFormProps) {
  const formId = useId();
  const {
    form,
    // isPending is handled by the parent now via isSubmitting prop
    onSubmit: handleFormSubmit,
  } = usePaymentMethodsForm({
    onSubmit: onSubmitSuccess,
    // Provide {} fallback for potentially undefined defaultValues
    defaultValues: defaultValues ?? {},
  });

  // Check for the specific field error where the refinement message is attached
  // The error from refine without a path is often attached to the root or ""
  const groupError = form.formState.errors['']?.message;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-0.5" // Keep general spacing if needed
        noValidate
      >
        <div className="space-y-2">
          {/* Render checkboxes dynamically */}
          {availableMethods.map((method) => (
            <FormFieldWrapper
              key={method.id}
              control={form.control}
              // Use method.id as the field name
              name={method.id as keyof PaymentMethodsFormValues}
              label="" // Label rendered by FormCheckbox
              showErrorMessage={false} // Keep hiding individual field messages
              className="h-6 space-y-0"
            >
              {(field) => (
                <FormCheckbox
                  field={field}
                  label={method.name} // Use method name as label
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
            disabled={isSubmitting} // Use isSubmitting prop
          >
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
