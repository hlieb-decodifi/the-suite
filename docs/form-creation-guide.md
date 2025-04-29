# Form Creation Guide

This guide outlines the standard approach for creating forms within our Next.js application. We follow a consistent pattern to ensure separation of concerns, reusability, and maintainability.

## Form Structure

Every form should follow this standard directory structure:

```
src/components/forms/[FormName]/
├── schema.ts            # Zod validation schema
├── use[FormName].ts     # Custom hook for form logic
├── [FormName].tsx       # Form component
├── index.ts             # Export file
└── components/          # (Optional) Form-specific components
```

## Separation of Modal and Form

If a form is displayed within a modal:

- The modal component should be created in `src/components/modals/[ModalName]/`
- The form logic and UI should be created in `src/components/forms/[FormName]/`
- The modal component should render the form component as its content

This separation ensures:

- Forms can be reused in different contexts (modals, pages, etc.)
- Concerns are properly separated (modal handling vs form handling)
- Testing is simplified

Example:

```tsx
// src/components/modals/SignInModal/SignInModal.tsx
import { SignInForm } from '@/components/forms/SignInForm';

export function SignInModal({ isOpen, onOpenChange }) {
  const handleSubmit = () => {
    // Handle successful submission
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title="Sign In">
      <SignInForm onSubmit={handleSubmit} />
    </Modal>
  );
}
```

## Form Components Breakdown

### 1. Schema (`schema.ts`)

The schema file defines the validation rules for the form using Zod. It should:

- Define the validation rules for each field
- Export the schema
- Export a TypeScript type for the form values

Example from `src/components/forms/SignInForm/schema.ts`:

```typescript
import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
```

### 2. Form Hook (`use[FormName].ts`)

The form hook encapsulates all the form logic:

- Form state using react-hook-form
- Form submission logic
- Loading/error states
- Side effects (e.g., redirects)

Example from `src/components/forms/SignInForm/useSignInForm.ts`:

```typescript
export function useSignInForm({
  onSubmit,
  defaultValues,
  redirectTo = '/profile',
}: UseSignInFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback(
    async (data: SignInFormValues) => {
      try {
        setIsPending(true);
        // API call logic here

        // Call the onSubmit callback passed from parent
        onSubmit(data);

        // Redirect if needed
        if (redirectTo) {
          router.push(redirectTo);
        }
      } catch (error) {
        // Error handling
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit, router, redirectTo],
  );

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
}
```

### 3. Form Component (`[FormName].tsx`)

The form component is responsible for:

- Rendering the form UI
- Using the form hook for logic
- Rendering appropriate form fields and buttons

Example (simplified version):

```tsx
export function SignInForm({ onSubmit, defaultValues }: SignInFormProps) {
  const {
    form,
    isPending,
    onSubmit: handleSubmit,
  } = useSignInForm({
    onSubmit,
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormInput
              label="Email"
              placeholder="Enter your email"
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              {...field}
            />
          )}
        />

        <FormButtons
          submitText="Sign In"
          isPending={isPending}
          saveSuccess={false}
        />
      </form>
    </Form>
  );
}
```

## Form Components

### Reusing Existing Components

Always check the `src/components/forms/components/` directory for reusable form components:

- `InputFormField.tsx` - Standard text input
- `PasswordInputFormField.tsx` - Password input field with show/hide toggle
- `FormButtons.tsx` - Standard form action buttons
- `RadioGroupFormField.tsx` - Radio button group
- `AddressSearchFormField.tsx` - Address autocomplete input

### Creating New Form Fields

When creating a new form input type:

1. First, check if it can be created by composing existing components
2. If not, create a new reusable component in `src/components/forms/components/`
3. Always wrap the input in a `FormField` component

**Important**: Do not mix up inputs and form fields:

- **Inputs** are the raw input elements (like text inputs, select dropdowns)
- **Form fields** are inputs wrapped with labels, error handling, etc.

Example of creating a new form field component:

```tsx
// src/components/forms/components/SelectInput.tsx
import { FormField } from './FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SelectInputProps = {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  // ... other props
};

export function SelectInput({
  label,
  options,
  placeholder = 'Select an option',
  error,
  ...props
}: SelectInputProps) {
  const id = useId();

  return (
    <FormField label={label} id={id} error={error}>
      <Select {...props}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
```

## Best Practices

1. **Separation of concerns**

   - Keep validation logic in schema
   - Keep form handling logic in the hook
   - Keep UI rendering in the component

2. **Props API design**

   - Forms should accept `onSubmit` callback for parent to handle success
   - Forms should accept `defaultValues` for initialization
   - Use consistent prop names across different forms

3. **Error handling**

   - Validation errors are handled by react-hook-form + zod
   - API/submission errors should be handled in the form hook
   - UI should display both validation and submission errors

4. **Loading states**
   - Track loading state in the form hook
   - Disable form controls during submission
   - Show appropriate loading UI

Follow this guide to ensure consistency across all forms in the application.
