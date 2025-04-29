'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type UpdateLocationData = {
  userId: string;
  addressData: {
    country: string;
    state: string;
    city: string;
    streetAddress: string;
  };
  existingAddressId: string | null;
};

// Type definition for our custom RPC function
type CustomSupabaseRPC = {
  rpc(
    fn: 'insert_address_and_return_id',
    params: {
      p_country: string;
      p_state: string; 
      p_city: string;
      p_street_address: string;
    }
  ): Promise<{ 
    data: string | null; 
    error: { message: string } | null 
  }>;
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
    } 
    // Otherwise create a new address
    else {
      console.log('Creating new address using RPC');
      // Use the supabase client with our custom type extension
      const { data, error: insertError } = await (supabase as unknown as CustomSupabaseRPC)
        .rpc('insert_address_and_return_id', {
          p_country: addressData.country,
          p_state: addressData.state,
          p_city: addressData.city,
          p_street_address: addressData.streetAddress
        });
      
      if (insertError) {
        console.error('Error creating address:', insertError);
        return { success: false, error: insertError.message };
      }
      
      // The data should be a UUID string
      addressId = data as string;

      console.log('Address created with ID:', addressId);
      
      // Update the user's client_profile with the new address ID
      const { error: profileError } = await supabase
        .from('client_profiles')
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