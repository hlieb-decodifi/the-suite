import { z } from 'zod';
import { PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

const isPhoneValid = (phone: string) => {
  try {
    return phoneUtil.isValidNumber(phoneUtil.parseAndKeepRawInput(phone));
  } catch {
    return false;
  }
};

// Zod preprocessor to add https:// if missing
const urlPreprocessor = (arg: unknown) => {
  if (
    typeof arg === 'string' &&
    arg.trim() !== '' &&
    !/^(https?:)?\/\//.test(arg)
  ) {
    return `https://${arg}`;
  }
  return arg;
};

// Schema for optional URL with preprocessing - ensure it returns string | undefined
const optionalUrlSchema = z.preprocess(
  urlPreprocessor,
  z
    .union([
      z.string().url({ message: 'Please enter a valid URL.' }),
      z.literal('').transform(() => undefined),
    ])
    .optional(),
);

export const headerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  profession: z.string(),
  description: z.string().max(500, 'Description cannot exceed 500 characters.'), // Example max length
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (phone) => {
        // Allow empty/undefined phone numbers
        if (!phone || phone.trim() === '') {
          return true;
        }
        // If phone is just a country code (e.g., '+1', '+44'), treat as empty
        const onlyCountryCode = /^\+\d{1,4}$/.test(phone.trim());
        if (onlyCountryCode) {
          return true;
        }
        // Validate using google-libphonenumber
        return isPhoneValid(phone);
      },
      {
        message: 'Please enter a valid phone number for the selected country',
      },
    ),
  // Replace socialMedia array with specific optional fields
  instagramUrl: optionalUrlSchema,
  facebookUrl: optionalUrlSchema,
  tiktokUrl: optionalUrlSchema,
});

export type HeaderFormValues = z.infer<typeof headerSchema>;
// Remove SocialMediaPlatform type if no longer needed elsewhere
// export type SocialMediaPlatform = z.infer<typeof socialMediaPlatformSchema>;
