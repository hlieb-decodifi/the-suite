import { z } from 'zod';

export const userTypes = ['professional', 'client'] as const;
export type UserType = (typeof userTypes)[number];

export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  userType: z.enum(userTypes, {
    required_error: 'Please select whether you are a professional or client',
  }),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
