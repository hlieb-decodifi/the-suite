'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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

  // Fetch all data on the server including user details from database
  const clientData = await getClientProfileData(user.id);

  return (
    <ClientProfilePageClient
      user={{
        ...user,
        // Override with database values for Google OAuth users
        user_metadata: {
          ...user.user_metadata,
          first_name: clientData.firstName || user.user_metadata?.first_name || '',
          last_name: clientData.lastName || user.user_metadata?.last_name || '',
        }
      }}
      profile={clientData.profile}
      address={clientData.address}
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

    return {
      firstName: userData?.first_name || '',
      lastName: userData?.last_name || '',
      profile: profile || null,
      address,
    };
  } catch (error) {
    console.error('Error fetching client profile data:', error);
    return {
      firstName: '',
      lastName: '',
      profile: null as ClientProfile | null,
      address: null as Address | null,
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
      .upsert({
        user_id: userId,
        phone_number: details.phone,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

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

    // If we have an existing address, update it
    if (existingAddressId) {
      const { error: updateError } = await supabase
        .from('addresses')
        .update({
          country: addressData.country,
          state: addressData.state,
          city: addressData.city,
          street_address: addressData.streetAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAddressId);

      if (updateError) {
        console.error('Error updating address:', updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Create a new address
      const { data: newAddress, error: insertError } = await supabase
        .from('addresses')
        .insert({
          country: addressData.country,
          state: addressData.state,
          city: addressData.city,
          street_address: addressData.streetAddress,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating address:', insertError);
        return { success: false, error: insertError.message };
      }

      addressId = newAddress.id;

      // Update the client profile with the new address ID
      const { error: profileError } = await supabase
        .from('client_profiles')
        .upsert({
          user_id: userId,
          address_id: addressId,
          location: `${addressData.city}, ${addressData.state}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

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
