# Form Creation Guide

This guide outlines the standard approach for creating forms within our Next.js application. We follow a consistent pattern using `react-hook-form`, `Zod`, and shared components to ensure separation of concerns, reusability, and maintainability.

## Standard Form Structure

Every form should follow this standard directory structure within `src/components/forms/`:

```
src/components/forms/
├── common/                 # Reusable form building blocks
│   ├── FormFieldWrapper.tsx  # Standard field layout (Label, Input, Error)
│   ├── FormInput.tsx         # Reusable Input component
│   ├── FormTextarea.tsx      # Reusable Textarea component
│   └── index.ts              # Exports for common components
│   └── ...                   # Other reusable form components (Select, Checkbox etc.)
└── [FormName]/             # Specific form implementation
    ├── schema.ts           # Zod validation schema
    ├── use[FormName].ts    # Custom hook for form logic & submission
    ├── [FormName].tsx      # The actual Form component UI
    ├── index.ts            # Exports for this specific form
    └── components/         # (Optional) Components used ONLY by this form
```

## Separation of Modal and Form

If a form is displayed within a modal:

- The modal component is created in `src/components/modals/[ModalName]/`.
- The form component (including schema, hook, UI) is created in `src/components/forms/[FormName]/`.
- The modal component renders the form component.

This ensures forms are reusable and concerns are separated (modal display vs. form logic).

```tsx
// Example: src/components/modals/ServiceModal/ServiceModal.tsx
import { ServiceForm, ServiceFormValues } from '@/components/forms/ServiceForm';
import { Dialog, DialogContent, ... } from '@/components/ui/dialog';

export function ServiceModal({ isOpen, onOpenChange, onSubmitSuccess, service }) {
  const handleFormSubmitSuccess = (data: ServiceFormValues) => {
    onSubmitSuccess({ ...data, id: service?.id }); // Pass data up
    onOpenChange(false); // Close modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* ...DialogHeader... */}
        <ServiceForm
          onSubmitSuccess={handleFormSubmitSuccess}
          onCancel={() => onOpenChange(false)}
          defaultValues={service ? { /* map service to form defaults */ } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Form Components Breakdown

### 1. Schema (`schema.ts`)

- Defines validation rules using `Zod`.
- Exports the schema object (e.g., `serviceSchema`).
- Exports the inferred TypeScript type for form values (e.g., `ServiceFormValues`).

```typescript
// src/components/forms/ServiceForm/schema.ts
import { z } from 'zod';

export const serviceSchema = z
  .object({
    name: z.string().min(1, 'Service name is required'),
    price: z.coerce
      .number({ invalid_type_error: 'Price must be a number' })
      .positive(),
    durationHours: z.coerce.number().int().min(0).optional(),
    durationMinutes: z.coerce
      .number({ required_error: 'Minutes are required' })
      .int()
      .min(0),
    description: z.string().optional(),
  })
  .refine(/* ... refinement logic ... */);

export type ServiceFormValues = z.infer<typeof serviceSchema>;
```

### 2. Form Hook (`use[FormName].ts`)

- Encapsulates form logic using `react-hook-form`.
- Initializes the form state with `useForm`, providing the `zodResolver` and `defaultValues`.
  - Handles parsing/mapping of `defaultValues` if needed (e.g., converting a duration string to hours/minutes).
- Implements the `handleSubmit` callback:
  - Sets loading states (`isPending`).
  - Performs any necessary data transformation/normalization before submission (e.g., converting hours/minutes back to a total duration).
  - Calls the `onSubmit` prop passed from the parent component (which usually triggers the API call).
  - Handles submission errors (e.g., using `setError` from `react-hook-form` or local state).

```typescript
// src/components/forms/ServiceForm/useServiceForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceSchema, ServiceFormValues } from './schema';
import { useCallback, useState } from 'react';
// Assume parseDuration exists
import { parseDuration } from '@/utils/durationUtils'; // Example path

export type UseServiceFormProps = {
  onSubmit: (data: ServiceFormValues) => Promise<void> | void;
  defaultValues?: Partial<
    Omit<ServiceFormValues, 'durationHours' | 'durationMinutes'>
  > & { duration?: string };
};

export function useServiceForm({
  onSubmit,
  defaultValues,
}: UseServiceFormProps) {
  const [isPending, setIsPending] = useState(false);
  const parsedDuration = parseDuration(defaultValues?.duration);

  const formDefaultValues: Partial<ServiceFormValues> = {
    /* carefully construct defaults */
  };

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: formDefaultValues,
  });

  const handleSubmit = useCallback(
    async (data: ServiceFormValues) => {
      setIsPending(true);
      // --- Normalize data if needed ---
      const totalMinutes =
        (data.durationHours ?? 0) * 60 + data.durationMinutes;
      const normalizedHours = Math.floor(totalMinutes / 60);
      const normalizedMinutes = totalMinutes % 60;
      const normalizedData: ServiceFormValues = {
        ...data,
        durationHours: normalizedHours > 0 ? normalizedHours : undefined,
        durationMinutes: normalizedMinutes,
      };
      // --- End Normalization ---
      try {
        await onSubmit(normalizedData);
      } catch (err) {
        console.error('Submission failed:', err);
        // Optional: form.setError('root.serverError', { message: 'Failed to save.' });
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit],
  );

  return { form, isPending, onSubmit: handleSubmit };
}
```

### 3. Form Component (`[FormName].tsx`)

- Renders the form UI structure using `shadcn/ui` `Form`.
- **Crucially, uses the reusable `FormFieldWrapper` component from `src/components/forms/common/` for each field.**
- Renders the appropriate **reusable input component** (e.g., `FormInput`, `FormTextarea` from `src/components/forms/common/`) inside the `FormFieldWrapper`.
- Adds necessary props to the input component (e.g., `placeholder`, `type`, `inputMode`, `numericOnly`, `allowDecimal`).
- Includes form action buttons (Submit, Cancel).
- Adds the `noValidate` attribute to the `<form>` tag to disable native browser validation pop-ups.

```tsx
// src/components/forms/ServiceForm/ServiceForm.tsx
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  FormFieldWrapper,
  FormInput,
  FormTextarea,
} from '@/components/forms/common';
import { useServiceForm, UseServiceFormProps } from './useServiceForm';
import { ServiceFormValues } from './schema';

export function ServiceForm({ onSubmitSuccess, onCancel, defaultValues }) {
  const {
    form,
    isPending,
    onSubmit: handleFormSubmit,
  } = useServiceForm({
    onSubmit: onSubmitSuccess, // Or wrap onSubmitSuccess if needed
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} noValidate>
        <FormFieldWrapper
          control={form.control}
          name="name"
          label="Service Name"
        >
          {(field) => <FormInput placeholder="e.g., Haircut" {...field} />}
        </FormFieldWrapper>

        <FormFieldWrapper control={form.control} name="price" label="Price ($)">
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

        {/* Example for Hours/Minutes */}
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
            <FormTextarea placeholder="Describe the service..." {...field} />
          )}
        </FormFieldWrapper>

        <div className="flex justify-end gap-2 pt-4">
          {/* Cancel / Submit Buttons */}
        </div>
      </form>
    </Form>
  );
}
```

## Reusable Form Components (`src/components/forms/common/`)

This directory holds the building blocks for creating consistent forms.

### `FormFieldWrapper`

- **Purpose**: Provides a standard layout for a form field, including the label, the input control area, and the error message display (using absolute positioning to prevent layout shifts). It wraps the standard `react-hook-form` `FormField`.
- **Usage**: Wrap each logical form field within your main form component (`[FormName].tsx`) using `<FormFieldWrapper>`. Pass `control`, `name`, and `label` props. Render the specific input component as children, passing the `field` object provided by the render prop.

### Common Input Components (`FormInput`, `FormTextarea`, etc.)

- **Purpose**: These are thin wrappers around `shadcn/ui` input elements (like `Input`, `Textarea`, `Select`). They ensure consistent prop handling and allow adding form-specific features (like the `numericOnly` logic in `FormInput`).
- **Usage**:
  1.  **Always check `src/components/forms/common/` first** to see if a suitable component already exists.
  2.  Use the existing component (e.g., `<FormInput>`, `<FormTextarea>`) inside the children render prop of `<FormFieldWrapper>`.
  3.  **If a needed input type is missing** (e.g., a custom Select wrapper, Checkbox group):
      - Create a **new reusable component** within `src/components/forms/common/`.
      - Follow the pattern of `FormInput.tsx` or `FormTextarea.tsx`:
        - Wrap the corresponding `shadcn/ui` component.
        - Use `React.forwardRef`.
        - Accept standard HTML attributes for the input type (e.g., `React.InputHTMLAttributes`).
        - Add any necessary form-specific props or logic.
      - Export the new component from `src/components/forms/common/index.ts`.

## Best Practices

1.  **Use `FormFieldWrapper`**: Enforces consistent layout and error handling for all fields.
2.  **Use Common Inputs**: Prioritize reusing components from `src/components/forms/common/`. Create new common components when necessary, rather than defining one-off input structures within specific forms.
3.  **Separation of Concerns**:
    - Validation logic in `schema.ts`.
    - Form state, submission logic, and data transformation in `use[FormName].ts`.
    - UI structure and rendering in `[FormName].tsx`, leveraging common components.
4.  **Props API**:
    - Forms should accept `onSubmitSuccess` (or similar) callback.
    - Accept `defaultValues` for initialization/editing.
    - The `use[FormName].ts` hook handles the `onSubmit` prop containing the core submission logic.
5.  **Error Handling**:
    - Zod + `FormFieldWrapper` handle field validation errors.
    - The `use[FormName].ts` hook should handle API/submission errors, potentially using `form.setError` to display messages.
6.  **Loading States**: Track and manage loading states within the `use[FormName].ts` hook and disable relevant UI elements (like the submit button) in `[FormName].tsx`.
7.  **Disable Native Validation**: Always add `noValidate` to the `<form>` element.

Follow this guide to ensure consistency, maintainability, and reusability across all forms in the application.
