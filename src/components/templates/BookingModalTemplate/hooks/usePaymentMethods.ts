'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Interface for payment method objects
 */
export type PaymentMethod = {
  id: string;
  name: string;
  is_online: boolean;
};

/**
 * Fetches payment methods for a professional profile
 */
async function fetchPaymentMethods(
  profileId: string,
): Promise<PaymentMethod[]> {
  if (!profileId) return [];

  try {
    const supabase = createClient();

    // First get the payment method IDs linked to this professional profile
    const { data: methodLinks, error: methodsError } = await supabase
      .from('professional_payment_methods')
      .select('payment_method_id')
      .eq('professional_profile_id', profileId);

    if (methodsError || !methodLinks || methodLinks.length === 0) {
      console.error('Error fetching payment methods links:', methodsError);
      return [];
    }

    // Extract the payment method IDs
    const methodIds = methodLinks.map((link) => link.payment_method_id);

    // Now fetch the actual payment methods
    const { data: methods, error: paymentMethodsError } = await supabase
      .from('payment_methods')
      .select('id, name, is_online')
      .in('id', methodIds);

    if (paymentMethodsError) {
      console.error('Error fetching payment methods:', paymentMethodsError);
      return [];
    }

    return methods || [];
  } catch (error) {
    console.error('Unexpected error in fetchPaymentMethods:', error);
    return [];
  }
}

/**
 * Hook for fetching payment methods using React Query
 */
export function usePaymentMethods(profileId: string, enabled = true) {
  return useQuery({
    queryKey: ['paymentMethods', profileId],
    queryFn: () => fetchPaymentMethods(profileId),
    enabled: Boolean(profileId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
