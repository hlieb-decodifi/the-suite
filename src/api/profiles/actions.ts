'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Database } from '@/../supabase/types';

// Type aliases using correct snake_case keys from Database types
type UserRow = Database['public']['Tables']['users']['Row'];
type ProfessionalProfileRow =
  Database['public']['Tables']['professional_profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];

// Combined type for the data needed in the Professional Profile View
export type ProfessionalProfileViewData = Pick<
  UserRow,
  'first_name' | 'last_name'
> &
  Partial<
    Pick<
      ProfessionalProfileRow,
      | 'description'
      | 'phone_number'
      | 'facebook_url'
      | 'instagram_url'
      | 'tiktok_url'
      | 'profession'
      | 'is_published'
    >
  > & {
    photoUrl?: ProfilePhotoRow['url'] | null;
    isSubscribed?: boolean; // Keep UI-only fields if necessary
  };

/**
 * Server Action: Fetch combined data for the Professional Profile View
 */
export async function getProfessionalProfileViewDataAction(userId: string) {
  const supabase = await createClient();
  try {
    // Simplified query syntax
    const { data, error } = await supabase
      .from('users')
      .select(
        `
        first_name,
        last_name,
        professional_profiles ( 
          description,
          phone_number,
          facebook_url,
          instagram_url, 
          tiktok_url,
          profession,
          is_published
        ),
        profile_photos ( url )
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching professional profile view data:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      // Use console.error for consistency
      console.error('User or essential profile data not found for ID:', userId);
      return { success: false, error: 'Profile data not found.' };
    }

    // Extract nested data safely
    const profile = Array.isArray(data.professional_profiles)
      ? data.professional_profiles[0]
      : data.professional_profiles;
    const photo = Array.isArray(data.profile_photos)
      ? data.profile_photos[0]
      : data.profile_photos;

    const profileViewData: ProfessionalProfileViewData = {
      first_name: data.first_name,
      last_name: data.last_name,
      description: profile?.description ?? null,
      phone_number: profile?.phone_number ?? null,
      facebook_url: profile?.facebook_url ?? null,
      instagram_url: profile?.instagram_url ?? null,
      tiktok_url: profile?.tiktok_url ?? null,
      profession: profile?.profession ?? null,
      is_published: profile?.is_published ?? false,
      photoUrl: photo?.url ?? null,
      isSubscribed: false, // Mock
    };

    return { success: true, data: profileViewData };
  } catch (error) {
    console.error('Server error fetching profile data:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch profile data';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Update Professional Profile Data (Header related)
 */
export async function updateProfessionalProfileHeaderAction(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    profession?: string | undefined;
    description?: string | undefined;
    phoneNumber?: string | null | undefined;
    facebookUrl?: string | null | undefined;
    instagramUrl?: string | null | undefined;
    tiktokUrl?: string | null | undefined;
  },
) {
  const supabase = await createClient();
  try {
    // 1. Update professional_profiles table (use snake_case)
    const { error: profileError } = await supabase
      .from('professional_profiles')
      .update({
        profession: data.profession || null,
        description: data.description || null,
        phone_number: data.phoneNumber || null,
        facebook_url: data.facebookUrl || null,
        instagram_url: data.instagramUrl || null,
        tiktok_url: data.tiktokUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 2. Update Auth User Metadata (First/Last Name)
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    });

    // 3. Check for errors from both operations
    if (profileError || authUpdateError) {
      const errorMessages = [profileError?.message, authUpdateError?.message]
        .filter(Boolean)
        .join(', ');
      console.error('Error updating profile/auth:', {
        profileError,
        authUpdateError,
      });
      return {
        success: false,
        error:
          errorMessages || 'An unknown error occurred updating profile data.',
      };
    }

    // 4. Revalidate relevant paths
    revalidatePath('/profile'); // Revalidate the profile page

    return { success: true };
  } catch (error) {
    console.error('Error updating profile header data:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update profile information';
    return { success: false, error: message };
  }
}

export type UpdateLocationData = {
  userId: string;
  addressData: {
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    apartment?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  };
  existingAddressId: string | null;
};

// Type definition for RPC parameters
type InsertAddressParams = {
  p_country: string;
  p_state: string;
  p_city: string;
  p_street_address: string;
  p_apartment?: string;
  p_latitude?: number;
  p_longitude?: number;
  p_google_place_id?: string;
};

/**
 * Server action to update a user's location data
 */
export async function updateLocationAction({
  userId,
  addressData,
  existingAddressId,
}: UpdateLocationData) {
  const supabase = await createClient();

  try {
    let addressId = existingAddressId;

    // If manually edited, clear coordinates and Google Place ID to prevent invalid data
    const isManualEdit = addressData.googlePlaceId === 'MANUAL_EDIT';
    const cleanedAddressData = {
      ...addressData,
      latitude: isManualEdit ? null : (addressData.latitude ?? null),
      longitude: isManualEdit ? null : (addressData.longitude ?? null),
      googlePlaceId: isManualEdit ? null : (addressData.googlePlaceId ?? null),
    };

    // If we have an existing address, update it
    if (existingAddressId) {
      const { error: updateError } = await supabase
        .from('addresses')
        .update({
          country: cleanedAddressData.country,
          state: cleanedAddressData.state,
          city: cleanedAddressData.city,
          street_address: cleanedAddressData.streetAddress,
          apartment: cleanedAddressData.apartment ?? null,
          latitude: cleanedAddressData.latitude,
          longitude: cleanedAddressData.longitude,
          google_place_id: cleanedAddressData.googlePlaceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAddressId);

      if (updateError) {
        console.error('Error updating address:', updateError);
        return { success: false, error: updateError.message };
      }
    }
    // Otherwise create a new address
    else {
      console.log('Creating new address using RPC');
      // Build RPC parameters with proper typing
      const rpcParams: InsertAddressParams = {
        p_country: cleanedAddressData.country,
        p_state: cleanedAddressData.state,
        p_city: cleanedAddressData.city,
        p_street_address: cleanedAddressData.streetAddress,
        ...(cleanedAddressData.apartment !== undefined &&
          cleanedAddressData.apartment !== null && {
            p_apartment: cleanedAddressData.apartment,
          }),
        ...(cleanedAddressData.latitude !== undefined &&
          cleanedAddressData.latitude !== null && {
            p_latitude: cleanedAddressData.latitude,
          }),
        ...(cleanedAddressData.longitude !== undefined &&
          cleanedAddressData.longitude !== null && {
            p_longitude: cleanedAddressData.longitude,
          }),
        ...(cleanedAddressData.googlePlaceId !== undefined &&
          cleanedAddressData.googlePlaceId !== null && {
            p_google_place_id: cleanedAddressData.googlePlaceId,
          }),
      };

      const { data, error: insertError } = await supabase.rpc(
        'insert_address_and_return_id',
        rpcParams as never,
      );

      if (insertError) {
        console.error('Error creating address:', insertError);
        return { success: false, error: insertError.message };
      }

      // The data should be a UUID string
      addressId = data as string;

      console.log('Address created with ID:', addressId);

      // Update the user's professional_profile with the new address ID
      const { error: profileError } = await supabase
        .from('professional_profiles')
        .update({ address_id: addressId })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating client profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    // Revalidate paths that might show the updated address
    revalidatePath('/profile');

    return { success: true, addressId };
  } catch (error) {
    console.error('Server error updating location:', error);
    return { success: false, error: 'Server error updating location' };
  }
}

export async function updateAddressPrivacyAction({
  userId,
  hideFullAddress,
}: {
  userId: string;
  hideFullAddress: boolean;
}) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        hide_full_address: hideFullAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating address privacy:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Server error updating address privacy:', error);
    return { success: false, error: 'Server error updating address privacy' };
  }
}
