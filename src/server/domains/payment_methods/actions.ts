'use server';

import { revalidatePath } from 'next/cache';
import {
  PaymentMethod,
  UpdateProfessionalPaymentMethodsPayload,
} from '@/types/payment_methods';
import {
  getAvailablePaymentMethodsFromDb,
  getProfessionalPaymentMethodsFromDb,
  getProfessionalPaymentMethodsFromDbReadOnly,
  updateProfessionalPaymentMethodsInDb,
} from './db';
import { onSubscriptionChangeAction } from '@/server/domains/stripe-services';
import { createClient } from '@/lib/supabase/server';

// Helper function to check if user's profile is published
async function isProfilePublished(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from('professional_profiles')
    .select('is_published')
    .eq('user_id', userId)
    .single();

  return profileData?.is_published === true;
}

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
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected server error occurred.';
    console.error('Server error fetching payment methods:', message);
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetch the payment methods accepted by a specific professional.
 */
export async function getProfessionalPaymentMethodsAction(
  userId: string,
): Promise<{
  success: boolean;
  methods?: PaymentMethod[];
  error?: string;
}> {
  try {
    const data = await getProfessionalPaymentMethodsFromDb(userId);
    return { success: true, methods: data };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected server error occurred.';
    console.error(
      'Server error fetching professional payment methods:',
      message,
    );
    return { success: false, error: message };
  }
}

/**
 * Server Action: Fetch the payment methods accepted by a specific professional (read-only, for public viewing).
 */
export async function getProfessionalPaymentMethodsReadOnlyAction(
  userId: string,
): Promise<{
  success: boolean;
  methods?: PaymentMethod[];
  error?: string;
}> {
  try {
    const data = await getProfessionalPaymentMethodsFromDbReadOnly(userId);
    return { success: true, methods: data };
  } catch {
    // For read-only access, we silently handle errors and return empty array
    return { success: true, methods: [] };
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
    // Check if profile is published and if we're trying to clear all payment methods
    const isPublished = await isProfilePublished(userId);
    const hasPaymentMethods = selectedMethodIds.length > 0;

    if (isPublished && !hasPaymentMethods) {
      return {
        success: false,
        error:
          'Cannot remove all payment methods while profile is published. You must have at least one payment method selected.',
      };
    }

    await updateProfessionalPaymentMethodsInDb(userId, selectedMethodIds);

    // Revalidate relevant paths
    revalidatePath('/profile');

    // Sync services with Stripe after payment method changes
    // This is important because credit card availability affects service status
    try {
      const syncResult = await onSubscriptionChangeAction(userId);
      if (!syncResult.success) {
        console.error(
          'Stripe service sync failed after payment method update:',
          syncResult.message,
        );
        // Don't fail the payment method update, just log the sync error
      }
    } catch (syncError) {
      console.error(
        'Error syncing services with Stripe after payment method update:',
        syncError,
      );
      // Don't fail the payment method update due to sync issues
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected server error occurred.';
    console.error('Server error updating payment methods:', message);
    return { success: false, error: message };
  }
}
