'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Server-side function to get service fee from admin configuration
 * Returns fee in cents
 */
export async function getServiceFeeFromConfig(): Promise<number> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from('admin_configs')
      .select('value')
      .eq('key', 'service_fee_dollars')
      .single();

    const serviceFeeInDollars = parseFloat(data?.value || '1.0');
    return Math.round(serviceFeeInDollars * 100); // Convert to cents
  } catch (error) {
    console.error('Error getting service fee from config:', error);
    return 100; // Default to $1.00 in cents
  }
}

/**
 * Server-side function to get service fee in dollars
 * Returns fee in dollars (decimal)
 */
export async function getServiceFeeInDollars(): Promise<number> {
  const feeInCents = await getServiceFeeFromConfig();
  return feeInCents / 100;
}

/**
 * Server action to get service fee - can be called from client components
 * Returns fee in dollars (decimal)
 */
export async function getServiceFeeAction(): Promise<{
  success: boolean;
  fee?: number;
  feeInCents?: number;
  error?: string;
}> {
  try {
    const serviceFeeInCents = await getServiceFeeFromConfig();
    const serviceFeeInDollars = serviceFeeInCents / 100;

    return {
      success: true,
      fee: serviceFeeInDollars,
      feeInCents: serviceFeeInCents,
    };
  } catch (error) {
    console.error('Error getting service fee:', error);
    return {
      success: false,
      error: 'Failed to get service fee',
      fee: 1.0,
      feeInCents: 100,
    };
  }
}
