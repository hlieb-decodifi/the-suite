import { z } from 'zod';

export const headerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  profession: z.string().optional(),
  description: z.string().optional(),
  phoneNumber: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  tiktokUrl: z.string().optional().nullable(),
});

export const publishToggleSchema = z.object({
  isPublished: z.boolean(),
}); 