import { Database } from '@/../supabase/types';
import { z } from 'zod';

// Database types from Supabase schema
export type ProfileDB = Database['public']['Tables']['users']['Row'];
export type ProfessionalProfileDB = Database['public']['Tables']['professional_profiles']['Row'];

// Client-side types
export type ProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  profession: string | null;
  description: string | null;
  phoneNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  photoUrl: string | null;
  isPublished: boolean | null;
  isSubscribed: boolean;
  cookieConsent: boolean;
  isAdmin?: boolean;
}

// Validation schemas
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

// Form values types
export type HeaderFormValues = z.infer<typeof headerFormSchema>;
export type PublishToggleValues = z.infer<typeof publishToggleSchema>; 