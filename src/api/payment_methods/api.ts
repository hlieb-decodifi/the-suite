import { PaymentMethod, UpdateProfessionalPaymentMethodsPayload } from '@/types/payment_methods';
import {
  getAvailablePaymentMethodsAction,
  getProfessionalPaymentMethodsAction,
  updateProfessionalPaymentMethodsAction,
} from '@/server/domains/payment_methods/actions';

/**
 * Fetch all available payment methods
 */
export async function getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
  const result = await getAvailablePaymentMethodsAction();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch available payment methods');
  }
  return result.methods || [];
}

/**
 * Fetch the payment methods accepted by a professional
 */
export async function getProfessionalPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const result = await getProfessionalPaymentMethodsAction(userId);
  if (!result.success) {
    // Don't throw error if it was just profile not found
    if (result.error === 'Professional profile not found.') {
      return [];
    }
    throw new Error(result.error || 'Failed to fetch professional payment methods');
  }
  return result.methods || [];
}

/**
 * Update the payment methods accepted by a professional
 */
export async function updateProfessionalPaymentMethods(
  payload: UpdateProfessionalPaymentMethodsPayload
) {
  const result = await updateProfessionalPaymentMethodsAction(payload);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update payment methods');
  }
  return result;
} 