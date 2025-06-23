'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect, RedirectType } from 'next/navigation';
import { ClientProfilePageClient } from './ClientProfilePageClient';
import type {
  ClientProfile,
  Address,
  DetailFormData,
  AddressFormData,
} from '@/api/profiles/types';
import { revalidatePath } from 'next/cache';

export async function ClientProfilePage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: isClient } = await supabase.rpc('is_client', {
    user_uuid: user.id,
  });
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  if (isProfessional) {
    redirect('/profile', RedirectType.replace);
  }

  if (!isClient) {
    redirect('/', RedirectType.replace);
  }

  // Fetch all data on the server including user details from database
  const clientData = await getClientProfileData(user.id);

  return (
    <ClientProfilePageClient
      user={{
        ...user,
        // Override with database values for Google OAuth users
        user_metadata: {
          ...user.user_metadata,
          first_name:
            clientData.firstName || user.user_metadata?.first_name || '',
          last_name: clientData.lastName || user.user_metadata?.last_name || '',
        },
      }}
      profile={clientData.profile}
      address={clientData.address}
      unreadMessagesCount={clientData.unreadMessagesCount}
    />
  );
}

// Server function to fetch client profile data
export async function getClientProfileData(userId: string) {
  try {
    const supabase = await createClient();

    // Fetch user's first and last name from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    }

    // Fetch client profile
    const { data: profile, error: profileError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching client profile:', profileError);
    }

    // Fetch address if profile has address_id
    let address: Address | null = null;
    if (profile?.address_id) {
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', profile.address_id)
        .single();

      if (addressError) {
        console.error('Error fetching address:', addressError);
      } else {
        address = addressData;
      }
    }

    // Fetch unread messages count
    let unreadMessagesCount = 0;
    try {
      const { getUnreadMessagesCount } = await import(
        '@/components/layouts/DashboardPageLayout/DashboardPageLayout'
      );
      unreadMessagesCount = await getUnreadMessagesCount(userId);
    } catch (messageError) {
      console.error('Error fetching unread messages count:', messageError);
    }

    return {
      firstName: userData?.first_name || '',
      lastName: userData?.last_name || '',
      profile: profile || null,
      address,
      unreadMessagesCount,
    };
  } catch (error) {
    console.error('Error fetching client profile data:', error);
    return {
      firstName: '',
      lastName: '',
      profile: null as ClientProfile | null,
      address: null as Address | null,
      unreadMessagesCount: 0,
    };
  }
}

// Server action to update user details
export async function updateUserDetailsAction(
  userId: string,
  details: DetailFormData,
) {
  try {
    const supabase = await createClient();

    // Update user metadata in auth.users
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        first_name: details.firstName,
        last_name: details.lastName,
      },
    });

    if (authError) {
      console.error('Error updating user metadata:', authError);
      return { success: false, error: authError.message };
    }

    // Update user in users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        first_name: details.firstName,
        last_name: details.lastName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (userError) {
      console.error('Error updating user details:', userError);
      return { success: false, error: userError.message };
    }

    // Update or create client profile with phone number
    const { error: profileError } = await supabase
      .from('client_profiles')
      .upsert(
        {
          user_id: userId,
          phone_number: details.phone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

    if (profileError) {
      console.error('Error updating client profile:', profileError);
      return { success: false, error: profileError.message };
    }

    revalidatePath('/client-profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating user details:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update user details',
    };
  }
}

// Server action to update client location
export async function updateClientLocationAction(
  userId: string,
  addressData: AddressFormData,
  existingAddressId: string | null,
) {
  try {
    const supabase = await createClient();
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
    } else {
      // Create a new address using the RPC function that bypasses RLS
      const { data: newAddressId, error: rpcError } = await supabase.rpc(
        'insert_address_and_return_id',
        {
          p_country: cleanedAddressData.country,
          p_state: cleanedAddressData.state,
          p_city: cleanedAddressData.city,
          p_street_address: cleanedAddressData.streetAddress,
          p_apartment: cleanedAddressData.apartment ?? undefined,
          p_latitude: cleanedAddressData.latitude ?? undefined,
          p_longitude: cleanedAddressData.longitude ?? undefined,
          p_google_place_id: cleanedAddressData.googlePlaceId ?? undefined,
        } as never, // Type assertion to handle RPC parameter mismatch
      );

      if (rpcError) {
        console.error('Error creating address via RPC:', rpcError);
        return { success: false, error: rpcError.message };
      }

      addressId = newAddressId as string;

      // Update the client profile with the new address ID
      const { error: profileError } = await supabase
        .from('client_profiles')
        .upsert(
          {
            user_id: userId,
            address_id: addressId,
            location: `${cleanedAddressData.city}, ${cleanedAddressData.state}`,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (profileError) {
        console.error('Error updating client profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    revalidatePath('/client-profile');
    return { success: true, addressId };
  } catch (error) {
    console.error('Error updating client location:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update location',
    };
  }
}
