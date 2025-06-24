'use server';

import { getServiceFeeFromConfig } from '@/server/domains/stripe-payments/stripe-operations';

/**
 * Get the current service fee from admin configuration
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
      feeInCents: serviceFeeInCents
    };
  } catch (error) {
    console.error('Error getting service fee:', error);
    return {
      success: false,
      error: 'Failed to get service fee',
      fee: 1.0,
      feeInCents: 100
    };
  }
} 