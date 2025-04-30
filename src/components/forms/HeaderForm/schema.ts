import { z } from 'zod';

// Basic E.164 format regex (adjust if more specific validation is needed)
// Allows + followed by 10-15 digits
const phoneRegex = /^\+\d{10,15}$/;

// Zod preprocessor to add https:// if missing
const urlPreprocessor = (arg: unknown) => {
  if (typeof arg === 'string' && arg.trim() !== '' && !/^(https?:)?\/\//.test(arg)) {
    return `https://${arg}`;
  }
  return arg;
};

// Schema for optional URL with preprocessing - ensure it returns string | undefined
const optionalUrlSchema = z.preprocess(
  urlPreprocessor,
  z.union([
    z.string().url({ message: 'Please enter a valid URL.' }),
    z.literal('').transform(() => undefined)
  ]).optional()
);

export const headerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  profession: z.string().min(1, 'Profession is required.'),
  description: z.string().max(500, 'Description cannot exceed 500 characters.'), // Example max length
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number (e.g., +1234567890).')
    .optional()
    .or(z.literal('')), // Allow empty string which we'll treat as undefined
  // Replace socialMedia array with specific optional fields
  instagramUrl: optionalUrlSchema,
  facebookUrl: optionalUrlSchema,
  tiktokUrl: optionalUrlSchema,
});

export type HeaderFormValues = z.infer<typeof headerSchema>;
// Remove SocialMediaPlatform type if no longer needed elsewhere
// export type SocialMediaPlatform = z.infer<typeof socialMediaPlatformSchema>; 