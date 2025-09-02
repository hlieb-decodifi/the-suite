import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  price: z.coerce
    .number({
      required_error: 'Price is required',
      invalid_type_error: 'Price must be a number',
    })
    .min(1, 'Price must be at least $1'),
  durationHours: z.coerce
    .number({
      invalid_type_error: 'Hours must be a whole number',
    })
    .int()
    .min(0, 'Hours cannot be negative')
    .optional(),
  durationMinutes: z.coerce
    .number({
      required_error: 'Minutes are required',
      invalid_type_error: 'Minutes must be a whole number',
    })
    .int()
    .min(0, 'Minutes cannot be negative'),
  description: z.string().optional(),
}).refine(
  (data) => {
    const hours = data.durationHours ?? 0;
    const minutes = data.durationMinutes;
    return hours > 0 || minutes > 0;
  },
  {
    message: 'Please enter a valid duration (minimum 1 minute)',
    path: ['durationMinutes'],
  }
);

export type ServiceFormValues = z.infer<typeof serviceSchema>; 