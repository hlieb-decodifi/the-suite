import { z } from 'zod';

export const locationFormSchema = z
  .object({
    address: z
      .string()
      .min(1, 'Please select an address from the search dropdown'),
    country: z.string().min(1, 'Country is required'),
    state: z.string().min(1, 'State/Province is required'),
    city: z.string().min(1, 'City is required'),
    streetAddress: z.string().min(1, 'Street address is required'),
    apartment: z.string().optional(),
    // Google Places data - can be a real place ID or MANUAL_EDIT flag
    googlePlaceId: z.string().refine((val) => val.length > 0, {
      message: 'Please select an address from the search dropdown',
    }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .refine(
    (data) => {
      // If it's a manual edit, coordinates should be cleared
      if (data.googlePlaceId === 'MANUAL_EDIT') {
        return !data.latitude && !data.longitude;
      }
      // For valid Google Places, we should have coordinates
      return true; // Allow saving even without coordinates for now
    },
    {
      message:
        'Address has been manually modified. Please select a new address from search to ensure accuracy.',
      path: ['googlePlaceId'],
    },
  );

export type LocationFormValues = z.infer<typeof locationFormSchema>;
