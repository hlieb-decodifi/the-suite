import { z } from 'zod';

export const updateEmailSchema = z
  .object({
    newEmail: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    confirmEmail: z
      .string()
      .min(1, 'Please confirm your email'),
    password: z
      .string()
      .min(1, 'Password is required to confirm your identity'),
  })
  .refine((data) => data.newEmail === data.confirmEmail, {
    message: 'Email addresses do not match',
    path: ['confirmEmail'],
  });

export type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>; 