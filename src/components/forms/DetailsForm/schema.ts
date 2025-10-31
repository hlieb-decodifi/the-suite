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

export const detailsFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  phone: z
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
        // Validate using google-libphonenumber as recommended by react-international-phone
        return isPhoneValid(phone);
      },
      {
        message: 'Please enter a valid phone number for the selected country',
      },
    ),
});

export type DetailsFormValues = z.infer<typeof detailsFormSchema>;
