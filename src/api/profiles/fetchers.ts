import { createClient } from '@/lib/supabase/client';
import {
  Address,
  AddressFormData,
  ClientProfile,
  DetailFormData,
} from './types';
import { User } from '@supabase/supabase-js';

// Get client profile for a user
export async function getClientProfile(
  userId: string,
): Promise<ClientProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }

  return data;
}

// Get address for a client profile
export async function getClientAddress(
  addressId: string | null,
): Promise<Address | null> {
  if (!addressId) return null;

  const supabase = createClient();

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', addressId)
    .single();

  if (error) {
    console.error('Error fetching address:', error);
    return null;
  }

  return data;
}

// Get client profile with address
export async function getClientProfileWithAddress(userId: string): Promise<{
  profile: ClientProfile | null;
  address: Address | null;
}> {
  const profile = await getClientProfile(userId);
  const address = profile?.address_id
    ? await getClientAddress(profile.address_id)
    : null;

  return { profile, address };
}

// Update user details
export async function updateUserDetails(
  user: User,
  details: DetailFormData,
): Promise<boolean> {
  const supabase = createClient();

  // Update user metadata in auth.users
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      first_name: details.firstName,
      last_name: details.lastName,
    },
  });

  if (authError) {
    console.error('Error updating user metadata:', authError);
    return false;
  }

  // Update user in users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      first_name: details.firstName,
      last_name: details.lastName,
    })
    .eq('id', user.id);

  if (userError) {
    console.error('Error updating user details:', userError);
    return false;
  }

  // Update client profile with phone number
  const { error: profileError } = await supabase
    .from('client_profiles')
    .update({ phone_number: details.phone })
    .eq('user_id', user.id);

  if (profileError) {
    console.error('Error updating client profile:', profileError);
    return false;
  }

  return true;
}

// Create a new address
export async function createAddress(
  addressData: AddressFormData,
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      country: addressData.country,
      state: addressData.state,
      city: addressData.city,
      street_address: addressData.streetAddress,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating address:', error);
    return null;
  }

  return data.id;
}

// Update existing address
export async function updateAddress(
  addressId: string,
  addressData: AddressFormData,
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('addresses')
    .update({
      country: addressData.country,
      state: addressData.state,
      city: addressData.city,
      street_address: addressData.streetAddress,
    })
    .eq('id', addressId);

  if (error) {
    console.error('Error updating address:', error);
    return false;
  }

  return true;
}

// Update client profile location and address
export async function updateClientLocation(
  userId: string,
  addressData: AddressFormData,
  existingAddressId: string | null,
): Promise<boolean> {
  const supabase = createClient();

  let addressId = existingAddressId;

  // If no existing address, create one
  if (!addressId) {
    addressId = await createAddress(addressData);
    if (!addressId) return false;
  } else {
    // Update existing address
    const updated = await updateAddress(addressId, addressData);
    if (!updated) return false;
  }

  // Update client profile with address_id
  const { error: profileError } = await supabase
    .from('client_profiles')
    .update({
      address_id: addressId,
      // Also update location field with city/state for backward compatibility
      location: `${addressData.city}, ${addressData.state}`,
    })
    .eq('user_id', userId);

  if (profileError) {
    console.error('Error updating client profile location:', profileError);
    return false;
  }

  return true;
}
