/**
 * @fileoverview Internal database utilities for Stripe service synchronization.
 *
 * @security IMPORTANT - All functions in this file use admin client to bypass RLS.
 * These are internal utilities for background jobs and should ONLY be called by:
 * - Stripe service sync actions (verify professional ownership before calling)
 * - Background sync jobs (cron jobs with API route protection)
 * - Service management actions (verify user owns service before syncing)
 *
 * DO NOT call these directly from user-facing code without authorization.
 *
 * @module stripe-services/db
 * @internal
 */

import { createAdminClient } from '@/lib/supabase/server';
import type {
  ProfessionalProfileForStripe,
  ServiceWithStripe,
  StripeProductStatus,
  StripeSyncStatus,
} from './types';

/**
 * @internal
 * Get professional profile data needed for Stripe evaluation.
 * Called by sync service after verifying professional ownership.
 */
export async function getProfessionalProfileForStripe(
  userId: string,
): Promise<ProfessionalProfileForStripe | null> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        `
        id,
        user_id,
        is_published,
        professional_stripe_connect(
          stripe_account_id,
          stripe_connect_status
        )
      `,
      )
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching professional profile for Stripe:', error);
      return null;
    }

    // Handle nullable boolean fields from database
    return {
      id: data.id,
      user_id: data.user_id,
      is_published: data.is_published ?? false,
      stripe_account_id:
        data.professional_stripe_connect?.stripe_account_id || null,
      stripe_connect_status: (data.professional_stripe_connect
        ?.stripe_connect_status || 'not_connected') as
        | 'not_connected'
        | 'pending'
        | 'complete',
    };
  } catch (error) {
    console.error('Error in getProfessionalProfileForStripe:', error);
    return null;
  }
}

/**
 * @internal
 * Check if professional has Credit Card payment method enabled.
 * Called by sync service to determine if services should sync.
 */
export async function professionalHasCreditCardPayment(
  professionalProfileId: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('professional_payment_methods')
      .select(
        `
        payment_methods!inner(name)
      `,
      )
      .eq('professional_profile_id', professionalProfileId);

    if (error) {
      console.error('Error checking credit card payment method:', error);
      return false;
    }

    // Check if any payment method is a credit card variant
    const hasCreditCard =
      data?.some((item) => {
        const name = item.payment_methods?.name?.toLowerCase();
        return name === 'credit card' || name === 'card' || name === 'credit';
      }) || false;

    return hasCreditCard;
  } catch (error) {
    console.error('Error in professionalHasCreditCardPayment:', error);
    return false;
  }
}

/**
 * @internal
 * Get services that need Stripe synchronization.
 * Called by background sync jobs and manual sync triggers.
 */
export async function getServicesPendingSync(
  limit: number = 50,
): Promise<ServiceWithStripe[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('stripe_sync_status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching services pending sync:', error);
      return [];
    }

    return (data || []) as ServiceWithStripe[];
  } catch (error) {
    console.error('Error in getServicesPendingSync:', error);
    return [];
  }
}

/**
 * @internal
 * Get all services for a professional profile.
 * Called by sync service after verifying professional ownership.
 */
export async function getServicesForProfessional(
  professionalProfileId: string,
): Promise<ServiceWithStripe[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_profile_id', professionalProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services for professional:', error);
      return [];
    }

    return (data || []) as ServiceWithStripe[];
  } catch (error) {
    console.error('Error in getServicesForProfessional:', error);
    return [];
  }
}

/**
 * @internal
 * Update service Stripe synchronization data.
 * Called by sync service after successful/failed Stripe API calls.
 */
export async function updateServiceStripeData(
  serviceId: string,
  updates: {
    stripe_product_id?: string | null;
    stripe_price_id?: string | null;
    stripe_status?: StripeProductStatus;
    stripe_sync_status?: StripeSyncStatus;
    stripe_sync_error?: string | null;
    stripe_synced_at?: string | null;
  },
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', serviceId);

    if (error) {
      console.error('Error updating service Stripe data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateServiceStripeData:', error);
    return false;
  }
}

/**
 * @internal
 * Mark service sync as successful.
 * Called by sync service after successful Stripe product creation.
 */
export async function markServiceSyncSuccess(
  serviceId: string,
  productId: string,
  priceId: string,
  status: StripeProductStatus,
): Promise<boolean> {
  return updateServiceStripeData(serviceId, {
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_status: status,
    stripe_sync_status: 'synced',
    stripe_sync_error: null,
    stripe_synced_at: new Date().toISOString(),
  });
}

/**
 * @internal
 * Mark service sync as failed.
 * Called by sync service after failed Stripe API calls.
 */
export async function markServiceSyncError(
  serviceId: string,
  error: string,
): Promise<boolean> {
  return updateServiceStripeData(serviceId, {
    stripe_sync_status: 'error',
    stripe_sync_error: error,
  });
}

/**
 * @internal
 * Mark all services for a professional as pending sync.
 * Called by sync service when subscription changes or Connect status updates.
 */
export async function markProfessionalServicesForSync(
  professionalProfileId: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('services')
      .update({
        stripe_sync_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('professional_profile_id', professionalProfileId);

    if (error) {
      console.error('Error marking professional services for sync:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markProfessionalServicesForSync:', error);
    return false;
  }
}

/**
 * @internal
 * Get service by ID with Stripe data.
 * Called by sync service to fetch current sync status.
 */
export async function getServiceWithStripeData(
  serviceId: string,
): Promise<ServiceWithStripe | null> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error || !data) {
      console.error('Error fetching service with Stripe data:', error);
      return null;
    }

    return data as ServiceWithStripe;
  } catch (error) {
    console.error('Error in getServiceWithStripeData:', error);
    return null;
  }
}

/**
 * @internal
 * Get services with sync errors for monitoring/troubleshooting.
 * Called by admin monitoring tools and error reports.
 */
export async function getServicesWithSyncErrors(
  limit: number = 100,
): Promise<ServiceWithStripe[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('stripe_sync_status', 'error')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching services with sync errors:', error);
      return [];
    }

    return (data || []) as ServiceWithStripe[];
  } catch (error) {
    console.error('Error in getServicesWithSyncErrors:', error);
    return [];
  }
}

/**
 * @internal
 * Reset service sync status to pending (for retry).
 * Called by admin tools to retry failed syncs.
 */
export async function resetServiceSyncStatus(
  serviceId: string,
): Promise<boolean> {
  return updateServiceStripeData(serviceId, {
    stripe_sync_status: 'pending',
    stripe_sync_error: null,
  });
}

/**
 * @internal
 * Get sync statistics for monitoring dashboards.
 * Called by admin monitoring/analytics tools.
 */
export async function getStripeSyncStats(): Promise<{
  pending: number;
  synced: number;
  error: number;
  total: number;
}> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('stripe_sync_status');

    if (error) {
      console.error('Error fetching sync stats:', error);
      return { pending: 0, synced: 0, error: 0, total: 0 };
    }

    const stats = data?.reduce(
      (acc, service) => {
        acc.total++;
        acc[service.stripe_sync_status as StripeSyncStatus]++;
        return acc;
      },
      { pending: 0, synced: 0, error: 0, total: 0 },
    ) || { pending: 0, synced: 0, error: 0, total: 0 };

    return stats;
  } catch (error) {
    console.error('Error in getStripeSyncStats:', error);
    return { pending: 0, synced: 0, error: 0, total: 0 };
  }
}
