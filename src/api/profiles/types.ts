import { Database } from '@/../supabase/types';

// Reference the database types
type UserRow = Database['public']['Tables']['users']['Row'];
type ProfessionalProfileRow =
  Database['public']['Tables']['professional_profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];

// Transform snake_case DB types to camelCase client types
export type ProfileData = {
  id: UserRow['id'];
  firstName: UserRow['first_name'];
  lastName: UserRow['last_name'];
  profession: ProfessionalProfileRow['profession'] | null;
  description: ProfessionalProfileRow['description'] | null;
  phoneNumber: ProfessionalProfileRow['phone_number'] | null;
  facebookUrl: ProfessionalProfileRow['facebook_url'] | null;
  instagramUrl: ProfessionalProfileRow['instagram_url'] | null;
  tiktokUrl: ProfessionalProfileRow['tiktok_url'] | null;
  photoUrl: ProfilePhotoRow['url'] | null;
  isPublished: ProfessionalProfileRow['is_published'] | null;
  isSubscribed: boolean; // This is a UI-only field, not in the database
};

// Form values should match the client-side types
export type HeaderFormValues = {
  firstName: string;
  lastName: string;
  profession?: string | undefined;
  description?: string | undefined;
  phoneNumber?: string | null | undefined;
  facebookUrl?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  tiktokUrl?: string | null | undefined;
};

export type Address = Database['public']['Tables']['addresses']['Row'];
export type ClientProfile =
  Database['public']['Tables']['client_profiles']['Row'];

export type AddressFormData = {
  country: string;
  state: string;
  city: string;
  streetAddress: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
};

export type DetailFormData = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type ClientProfileWithAddress = ClientProfile & {
  address: Address | null;
  user: {
    first_name: string;
    last_name: string;
  };
};

// Fix for Form Values
export type LocationFormData = {
  address: string;
  country: string;
  state: string;
  city: string;
  streetAddress: string;
};
