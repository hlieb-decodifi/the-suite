import { z } from 'zod';

export const locationFormSchema = z.object({
  address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  streetAddress: z.string().optional(),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>; 