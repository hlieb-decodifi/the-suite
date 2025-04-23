import { z } from 'zod';

/**
 * Schema for validating sign-in form data
 */
export const signInSchema = z.object({
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
 * Type definition derived from the sign-in schema
 */
export type SignInFormValues = z.infer<typeof signInSchema>;

/**
 * Default empty values for the sign-in form
 */
export const defaultSignInValues: SignInFormValues = {
  email: '',
  password: '',
}; 