import { z } from 'zod';

export const PAYMENT_METHODS = [
  { id: 'creditCard', label: 'Credit Card' },
  { id: 'cash', label: 'Cash' },
  // Add other methods here if needed in the future
] as const; // Use const assertion for stricter typing

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

export const paymentMethodsSchema = z.object({
  // Make fields optional in schema
  creditCard: z.boolean().optional(),
  cash: z.boolean().optional(),
  // Add corresponding boolean fields for any new methods
}).refine(
  (data) => {
    // Check optional values, defaulting to false if undefined
    return (data.creditCard ?? false) || (data.cash ?? false);
  },
  {
    // Remove path again to ensure it's a root error
    message: 'Please select at least one payment method',
    // Attach error back to a specific field
    path: ['creditCard'],
  }
);

export type PaymentMethodsFormValues = z.infer<typeof paymentMethodsSchema>; 