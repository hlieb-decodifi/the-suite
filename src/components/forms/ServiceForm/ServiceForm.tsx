import {
  Form,
  // FormControl, // No longer directly needed
  // FormField, // No longer directly needed
  // FormItem, // No longer directly needed
  // FormLabel, // No longer directly needed
  // FormMessage, // No longer directly needed
} from '@/components/ui/form';
// Remove direct input/textarea imports from ui
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
// import { cn } from '@/utils/cn'; // No longer needed here
import {
  FormFieldWrapper,
  FormInput,
  FormTextarea,
} from '@/components/forms/common'; // Import common components
import { useServiceForm, UseServiceFormProps } from './useServiceForm';
import { ServiceFormValues } from './schema';

// Potentially use FormButtons if it exists and is suitable
// import { FormButtons } from '../components/FormButtons';

export type ServiceFormProps = {
  onSubmitSuccess: (data: ServiceFormValues) => void;
  onCancel?: () => void;
  defaultValues?: Partial<ServiceFormValues> | undefined;
  // Add isEditMode if needed for button text etc.
  // isEditMode?: boolean;
};

export function ServiceForm({
  onSubmitSuccess,
  onCancel,
  defaultValues,
}: ServiceFormProps) {
  const hookProps: UseServiceFormProps = {
    onSubmit: async (data) => {
      onSubmitSuccess(data);
    },
    // Conditionally add defaultValues only if it's provided
    ...(defaultValues && { defaultValues }),
  };

  const {
    form,
    isPending,
    onSubmit: handleFormSubmit,
  } = useServiceForm(hookProps);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Render potential submission error here */}
        {/* {error && <Alert variant="destructive">{error}</Alert>} */}

        <FormFieldWrapper
          control={form.control}
          name="name"
          label="Service Name"
        >
          {(field) => <FormInput placeholder="e.g., Haircut" {...field} />}
        </FormFieldWrapper>

        <FormFieldWrapper control={form.control} name="price" label="Price ($">
          {(field) => (
            <FormInput
              type="text"
              inputMode="decimal"
              placeholder="e.g., 50.00"
              numericOnly
              allowDecimal
              {...field}
              value={field.value ?? ''}
            />
          )}
        </FormFieldWrapper>

        {/* Duration Fields - Hours and Minutes */}
        <div className="grid grid-cols-2 gap-4">
          <FormFieldWrapper
            control={form.control}
            name="durationHours"
            label="Duration (Hours)"
          >
            {(field) => (
              <FormInput
                type="text"
                inputMode="numeric"
                placeholder="e.g., 1"
                numericOnly
                {...field}
                value={field.value ?? ''}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            control={form.control}
            name="durationMinutes"
            label="Duration (Mins)"
          >
            {(field) => (
              <FormInput
                type="text"
                inputMode="numeric"
                placeholder="e.g., 30"
                numericOnly
                {...field}
                value={field.value ?? ''}
              />
            )}
          </FormFieldWrapper>
        </div>

        <FormFieldWrapper
          control={form.control}
          name="description"
          label="Description (Optional)"
        >
          {(field) => (
            <FormTextarea
              placeholder="Provide a brief description of the service..."
              className="resize-none h-24"
              {...field}
            />
          )}
        </FormFieldWrapper>

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending
              ? 'Saving...'
              : defaultValues
                ? 'Save Changes'
                : 'Add Service'}
          </Button>
        </div>

        {/* If FormButtons component exists and handles cancel/submit:
        <FormButtons
          submitText={defaultValues ? 'Save Changes' : 'Add Service'}
          cancelText="Cancel"
          onCancel={onCancel}
          isPending={isPending}
          // Pass saveSuccess if FormButtons uses it
        />
        */}
      </form>
    </Form>
  );
}
