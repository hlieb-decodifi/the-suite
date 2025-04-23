import { z } from 'zod';

/**
 * Schema for validating sign-up form data
 */
export const signUpSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

/**
 * Type definition derived from the sign-up schema
 */
export type SignUpFormValues = z.infer<typeof signUpSchema>;

/**
 * Default empty values for the sign-up form
 */
export const defaultSignUpValues: SignUpFormValues = {
  full_name: '',
  email: '',
  password: '',
}; 