import { createClient } from '@/lib/supabase/server';
import { PaymentMethod } from '@/types/payment_methods';

/**
 * Fetch all available payment methods from the master list.
 */
export async function getAvailablePaymentMethodsFromDb(): Promise<PaymentMethod[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching available payment methods:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get the professional profile ID for a user
 */
export async function getProfessionalProfileId(userId: string): Promise<string> {
  const supabase = await createClient();
  
  // First check if user is actually a professional
  const { data: isProfessional, error: roleError } = await supabase.rpc(
    'is_professional',
    { user_uuid: userId }
  );
  
  if (roleError) {
    console.error('Error checking if user is professional:', roleError);
    throw new Error('Could not verify user role.');
  }
  
  if (!isProfessional) {
    throw new Error('User is not a professional. Cannot access professional profile.');
  }
  
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching professional profile ID:', error);
    
    // If profile doesn't exist but user is professional, try to create it
    if (error?.code === 'PGRST116') {
      console.log('Professional profile not found, attempting to create one for user:', userId);
      
      const { data: newProfile, error: createError } = await supabase
        .from('professional_profiles')
        .insert({ user_id: userId })
        .select('id')
        .single();
      
      if (createError) {
        console.error('Error creating professional profile:', createError);
        throw new Error('Could not create professional profile for the user.');
      }
      
      if (newProfile) {
        console.log('Created new professional profile with ID:', newProfile.id);
        return newProfile.id;
      }
    }
    
    throw new Error(error?.message || 'Professional profile not found.');
  }
  
  return data.id;
}

/**
 * Fetch the payment methods accepted by a specific professional.
 */
export async function getProfessionalPaymentMethodsFromDb(userId: string): Promise<PaymentMethod[]> {
  const supabase = await createClient();
  
  try {
    // Get professional profile ID
    const professionalProfileId = await getProfessionalProfileId(userId);
    
    // Fetch linked payment methods using the junction table
    const { data, error } = await supabase
      .from('professional_payment_methods')
      .select('payment_methods (*)')
      .eq('professional_profile_id', professionalProfileId);

    if (error) {
      console.error('Error fetching professional payment methods:', error);
      throw new Error(error.message);
    }

    // Extract the payment method data from the join result
    const acceptedMethods = data?.map(item => item.payment_methods).filter(Boolean) as PaymentMethod[];
    return acceptedMethods;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Professional profile not found')) {
      return []; // Return empty array if profile not found, as it might be a new user
    }
    throw error;
  }
}

/**
 * Update the payment methods accepted by a professional.
 */
export async function updateProfessionalPaymentMethodsInDb(
  userId: string, 
  selectedMethodIds: string[]
): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Get professional profile ID
    const professionalProfileId = await getProfessionalProfileId(userId);
    
    // Get current accepted method IDs for this professional
    const { data: currentMethodsData, error: currentError } = await supabase
      .from('professional_payment_methods')
      .select('payment_method_id')
      .eq('professional_profile_id', professionalProfileId);

    if (currentError) {
      console.error('Error fetching current payment methods:', currentError);
      throw new Error(currentError.message);
    }
    
    const currentMethodIds = currentMethodsData.map(m => m.payment_method_id);

    // Determine which methods to add and which to delete
    const methodsToAdd = selectedMethodIds.filter(id => !currentMethodIds.includes(id));
    const methodsToDelete = currentMethodIds.filter(id => !selectedMethodIds.includes(id));

    // Perform deletions
    if (methodsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('professional_payment_methods')
        .delete()
        .eq('professional_profile_id', professionalProfileId)
        .in('payment_method_id', methodsToDelete);

      if (deleteError) {
        console.error('Error deleting payment methods:', deleteError);
        throw new Error(deleteError.message);
      }
    }

    // Perform insertions
    if (methodsToAdd.length > 0) {
      const rowsToInsert = methodsToAdd.map(methodId => ({
        professional_profile_id: professionalProfileId,
        payment_method_id: methodId,
      }));

      const { error: insertError } = await supabase
        .from('professional_payment_methods')
        .insert(rowsToInsert);

      if (insertError) {
        console.error('Error adding payment methods:', insertError);
        throw new Error(insertError.message);
      }
    }
  } catch (error) {
    console.error('Error updating professional payment methods:', error);
    throw error;
  }
} 