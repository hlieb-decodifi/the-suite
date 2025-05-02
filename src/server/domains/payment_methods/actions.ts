'use server';

import { revalidatePath } from 'next/cache';
import { PaymentMethod, UpdateProfessionalPaymentMethodsPayload } from '@/types/payment_methods';
import { 
  getAvailablePaymentMethodsFromDb,
  getProfessionalPaymentMethodsFromDb,
  updateProfessionalPaymentMethodsInDb
} from './db';

/**
 * Server Action: Fetch all available payment methods from the master list.
 */
export async function getAvailablePaymentMethodsAction(): Promise<{
  success: boolean;
  methods?: PaymentMethod[];
  error?: string;
}> {
  try {
    const data = await getAvailablePaymentMethodsFromDb();
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
  methods?: PaymentMethod[];
  error?: string;
}> {
  try {
    const data = await getProfessionalPaymentMethodsFromDb(userId);
    return { success: true, methods: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('Server error fetching professional payment methods:', message);
    return { success: false, error: message };
  }
}

/**
 * Server Action: Update the payment methods accepted by a professional.
 */
export async function updateProfessionalPaymentMethodsAction({
  userId,
  selectedMethodIds,
}: UpdateProfessionalPaymentMethodsPayload): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await updateProfessionalPaymentMethodsInDb(userId, selectedMethodIds);
    
    // Revalidate relevant paths
    revalidatePath('/profile');
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    console.error('Server error updating payment methods:', message);
    return { success: false, error: message };
  }
} 