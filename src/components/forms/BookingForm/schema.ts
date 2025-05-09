import { z } from 'zod';

export const bookingSchema = z.object({
  // Service selection
  serviceId: z.string(),
  extraServiceIds: z.array(z.string()),
  
  // Date and time
  date: z.date({
    required_error: "Please select an appointment date",
  }),
  timeSlot: z.string({
    required_error: "Please select an appointment time",
  }),
  
  // Payment
  paymentMethodId: z.string({
    required_error: "Please select a payment method",
  }),
  
  // Additional details
  notes: z.string().optional(),
  
  // Tips
  tipAmount: z.number().min(0),
});

export type BookingFormValues = z.infer<typeof bookingSchema>; 