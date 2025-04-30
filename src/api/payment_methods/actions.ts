'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PaymentMethod, UpdateProfessionalPaymentMethodsPayload } from './types';

/**
 * Server Action: Fetch all available payment methods from the master list.
 */
export async function getAvailablePaymentMethodsAction(): Promise<{
  success: boolean;
  methods?: PaymentMethod[];
  error?: string;
}> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name', { ascending: true }); // Optional: order alphabetically

    if (error) {
      console.error('Error fetching available payment methods:', error);
      return { success: false, error: error.message };
    }

    return { success: true, methods: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('Server error fetching payment methods:', message);
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetch the payment methods accepted by a specific professional.
 */
export async function getProfessionalPaymentMethodsAction(userId: string): Promise<{
  success: boolean;
  methods?: PaymentMethod[]; // Return the actual payment method details
  error?: string;
}> {
  const supabase = await createClient();
  try {
    // Fetch professional_profile_id first
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching professional profile ID:', profileError);
      return { success: false, error: profileError?.message || 'Professional profile not found.' };
    }
    
    const professionalProfileId = profileData.id;

    // Fetch linked payment methods using the junction table
    const { data, error } = await supabase
      .from('professional_payment_methods')
      .select('payment_methods (*)') // Select all columns from the joined payment_methods table
      .eq('professional_profile_id', professionalProfileId);

    if (error) {
      console.error('Error fetching professional payment methods:', error);
      return { success: false, error: error.message };
    }

    // Extract the payment method data from the join result
    const acceptedMethods = data?.map(item => item.payment_methods).filter(Boolean) as PaymentMethod[];

    return { success: true, methods: acceptedMethods };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('Server error fetching professional payment methods:', message);
    return { success: false, error: message };
  }
}


/**
 * Server Action: Update the payment methods accepted by a professional.
 * This action handles additions and deletions based on the provided list.
 */
export async function updateProfessionalPaymentMethodsAction({
  userId,
  selectedMethodIds,
}: UpdateProfessionalPaymentMethodsPayload): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    // 1. Get the professional_profile_id associated with the user_id
    const { data: profileData, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('Error finding professional profile for update:', profileError);
      return { success: false, error: profileError?.message || 'Professional profile not found.' };
    }
    const professionalProfileId = profileData.id;

    // 2. Get current accepted method IDs for this professional
    const { data: currentMethodsData, error: currentError } = await supabase
      .from('professional_payment_methods')
      .select('payment_method_id')
      .eq('professional_profile_id', professionalProfileId);

    if (currentError) {
      console.error('Error fetching current payment methods:', currentError);
      return { success: false, error: currentError.message };
    }
    const currentMethodIds = currentMethodsData.map(m => m.payment_method_id);

    // 3. Determine which methods to add and which to delete
    const methodsToAdd = selectedMethodIds.filter(id => !currentMethodIds.includes(id));
    const methodsToDelete = currentMethodIds.filter(id => !selectedMethodIds.includes(id));

    // 4. Perform deletions
    if (methodsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('professional_payment_methods')
        .delete()
        .eq('professional_profile_id', professionalProfileId)
        .in('payment_method_id', methodsToDelete);

      if (deleteError) {
        console.error('Error deleting payment methods:', deleteError);
        return { success: false, error: deleteError.message };
      }
    }

    // 5. Perform insertions
    if (methodsToAdd.length > 0) {
      const rowsToInsert = methodsToAdd.map(methodId => ({
        professional_profile_id: professionalProfileId,
        payment_method_id: methodId,
      }));

      const { error: insertError } = await supabase
        .from('professional_payment_methods')
        .insert(rowsToInsert);
        // Supabase insert automatically handles duplicates if the unique constraint exists

      if (insertError) {
        console.error('Error adding payment methods:', insertError);
        // Consider potential partial success/failure scenarios if needed
        return { success: false, error: insertError.message };
      }
    }

    // 6. Revalidate relevant paths
    revalidatePath('/profile'); 

    return { success: true };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('Server error updating payment methods:', message);
    return { success: false, error: message };
  }
} 