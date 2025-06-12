import { z } from 'zod';

export const createChangeEmailSchema = (currentEmail?: string) => z.object({
  newEmail: z
    .string()
    .min(1, 'New email is required')
    .email('Please enter a valid email address'),
  confirmEmail: z
    .string()
    .min(1, 'Email confirmation is required')
    .email('Please enter a valid email address'),
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Email addresses don't match",
  path: ["confirmEmail"],
}).refine((data) => !currentEmail || data.newEmail !== currentEmail, {
  message: "New email must be different from current email",
  path: ["newEmail"],
});

// Default schema for backward compatibility
export const changeEmailSchema = createChangeEmailSchema();

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>; 