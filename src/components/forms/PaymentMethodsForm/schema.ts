import { z } from 'zod';

// Removed hardcoded PAYMENT_METHODS constant

// Define the schema based on expected dynamic keys (all booleans)
// This assumes keys will be UUID strings from the fetched availableMethods.
// Using z.record for dynamic keys, expecting boolean values.
export const paymentMethodsSchema = z
  .record(z.string().uuid(), z.boolean().optional())
  .refine(
    (data) => {
      // Ensure at least one payment method is selected
      return Object.values(data).some((isSelected) => isSelected);
    },
    {
      message: 'Please select at least one payment method.',
      // Path can target a specific field if needed, or be omitted for a general form error
      // path: ['general'], // Example: Assign error to a non-existent field for general display
    },
  );

// This type will now represent an object with UUID keys and boolean values
export type PaymentMethodsFormValues = z.infer<typeof paymentMethodsSchema>;
