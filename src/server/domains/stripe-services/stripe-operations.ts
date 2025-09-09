import { stripe } from '@/lib/stripe/server';
import { checkProfessionalSubscription } from '@/utils/subscriptionUtils';
import type {
  ServiceWithStripe,
  ProfessionalStripeStatus,
  StripeSyncResult,
  StripeProductStatus
} from './types';
import {
  getProfessionalProfileForStripe,
  professionalHasCreditCardPayment,
  markServiceSyncSuccess,
  markServiceSyncError
} from './db';

/**
 * Evaluate professional's Stripe status to determine sync behavior
 */
export async function evaluateProfessionalStripeStatus(userId: string): Promise<ProfessionalStripeStatus> {
  try {
    const profile = await getProfessionalProfileForStripe(userId);
    
    if (!profile) {
      return {
        shouldSyncToStripe: false,
        shouldBeActive: false,
        reason: 'Professional profile not found',
        hasSubscription: false,
        isPublished: false,
        isStripeConnected: false,
        hasCreditCardPayment: false
      };
    }

    const hasSubscription = await checkProfessionalSubscription(profile.id);
    const isPublished = profile.is_published;
    const isStripeConnected = profile.stripe_connect_status === 'complete' && !!profile.stripe_account_id;
    const hasCreditCardPayment = await professionalHasCreditCardPayment(profile.id);

    // Determine if we should sync to Stripe
    const shouldSyncToStripe = hasSubscription;

    // Determine if products should be active (live) in Stripe
    const shouldBeActive = hasSubscription && isPublished && isStripeConnected && hasCreditCardPayment;

    let reason = '';
    if (!hasSubscription) {
      reason = 'No active subscription - services will not be synced to Stripe';
    } else if (!shouldBeActive) {
      const missing = [];
      if (!isPublished) missing.push('profile not published');
      if (!isStripeConnected) missing.push('Stripe Connect not completed');
      if (!hasCreditCardPayment) missing.push('Credit Card payment method not enabled');
      reason = `Services will be synced as draft - missing: ${missing.join(', ')}`;
    } else {
      reason = 'All conditions met - services will be active in Stripe';
    }

    return {
      shouldSyncToStripe,
      shouldBeActive,
      reason,
      hasSubscription,
      isPublished,
      isStripeConnected,
      hasCreditCardPayment
    };
  } catch (error) {
    console.error('Error evaluating professional Stripe status:', error);
    return {
      shouldSyncToStripe: false,
      shouldBeActive: false,
      reason: 'Error evaluating status',
      hasSubscription: false,
      isPublished: false,
      isStripeConnected: false,
      hasCreditCardPayment: false
    };
  }
}

/**
 * Create a Stripe product for a service
 */
export async function createStripeProduct(
  service: ServiceWithStripe,
  stripeAccountId: string
): Promise<StripeSyncResult> {
  try {
    const productData: {
      name: string;
      description?: string;
      metadata: Record<string, string>;
    } = {
      name: service.name,
      metadata: {
        service_id: service.id,
        professional_profile_id: service.professional_profile_id,
        created_by: 'the-suite-app'
      }
    };

    // Only include description if it's not empty
    if (service.description && service.description.trim() !== '') {
      productData.description = service.description;
    }

    const product = await stripe.products.create(productData, {
      stripeAccount: stripeAccountId
    });

    return {
      success: true,
      productId: product.id
    };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating product'
    };
  }
}

/**
 * Create a Stripe price for a service
 */
export async function createStripePrice(
  service: ServiceWithStripe,
  productId: string,
  stripeAccountId: string
): Promise<StripeSyncResult> {
  try {
    // Convert price to cents
    const unitAmount = Math.round(service.price * 100);

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmount,
      currency: 'usd', // TODO: Make this configurable
      metadata: {
        service_id: service.id,
        professional_profile_id: service.professional_profile_id,
        duration_minutes: service.duration.toString(),
        created_by: 'the-suite-app'
      }
    }, {
      stripeAccount: stripeAccountId
    });

    return {
      success: true,
      priceId: price.id
    };
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating price'
    };
  }
}

/**
 * Update a Stripe product
 */
export async function updateStripeProduct(
  service: ServiceWithStripe,
  stripeAccountId: string
): Promise<StripeSyncResult> {
  try {
    if (!service.stripe_product_id) {
      return {
        success: false,
        error: 'No Stripe product ID found for service'
      };
    }

    const updateData: {
      name: string;
      description?: string;
      metadata: Record<string, string>;
    } = {
      name: service.name,
      metadata: {
        service_id: service.id,
        professional_profile_id: service.professional_profile_id,
        updated_by: 'the-suite-app',
        last_updated: new Date().toISOString()
      }
    };

    // Only include description if it's not empty
    if (service.description && service.description.trim() !== '') {
      updateData.description = service.description;
    }

    await stripe.products.update(service.stripe_product_id, updateData, {
      stripeAccount: stripeAccountId
    });

    return {
      success: true,
      productId: service.stripe_product_id
    };
  } catch (error) {
    console.error('Error updating Stripe product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating product'
    };
  }
}

/**
 * Update Stripe product status (active/inactive)
 */
export async function updateStripeProductStatus(
  productId: string,
  active: boolean,
  stripeAccountId: string
): Promise<StripeSyncResult> {
  try {
    await stripe.products.update(productId, {
      active
    }, {
      stripeAccount: stripeAccountId
    });

    return {
      success: true,
      productId,
      status: active ? 'active' : 'inactive'
    };
  } catch (error) {
    console.error('Error updating Stripe product status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating product status'
    };
  }
}

/**
 * Archive a Stripe product (soft delete)
 */
export async function archiveStripeProduct(
  productId: string,
  stripeAccountId: string
): Promise<StripeSyncResult> {
  try {
    await stripe.products.update(productId, {
      active: false,
      metadata: {
        archived_at: new Date().toISOString(),
        archived_by: 'the-suite-app'
      }
    }, {
      stripeAccount: stripeAccountId
    });

    return {
      success: true,
      productId,
      status: 'inactive'
    };
  } catch (error) {
    console.error('Error archiving Stripe product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error archiving product'
    };
  }
}

/**
 * Synchronize a single service with Stripe
 * This is the main function to call from server actions
 */
export async function syncServiceWithStripe(
  service: ServiceWithStripe,
  userId: string
): Promise<StripeSyncResult> {
  try {
    // Get professional status
    const professionalStatus = await evaluateProfessionalStripeStatus(userId);
    
    // If professional shouldn't sync to Stripe, skip
    if (!professionalStatus.shouldSyncToStripe) {
      await markServiceSyncSuccess(service.id, '', '', 'draft');
      return {
        success: true,
        status: 'draft'
      };
    }

    // Get professional profile for Stripe account ID
    const profile = await getProfessionalProfileForStripe(userId);
    const stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      const error = 'No Stripe account ID available';
      await markServiceSyncError(service.id, error);
      return {
        success: false,
        error
      };
    }

    let productResult: StripeSyncResult;
    let priceResult: StripeSyncResult;

    // Create or update product
    if (!service.stripe_product_id) {
      // Create new product
      productResult = await createStripeProduct(service, stripeAccountId);
      if (!productResult.success || !productResult.productId) {
        await markServiceSyncError(service.id, productResult.error || 'Failed to create product');
        return productResult;
      }

      // Create price for the new product
      priceResult = await createStripePrice(service, productResult.productId, stripeAccountId);
      if (!priceResult.success || !priceResult.priceId) {
        await markServiceSyncError(service.id, priceResult.error || 'Failed to create price');
        return priceResult;
      }
    } else {
      // Update existing product
      productResult = await updateStripeProduct(service, stripeAccountId);
      if (!productResult.success) {
        await markServiceSyncError(service.id, productResult.error || 'Failed to update product');
        return productResult;
      }

      // Check if price needs to be updated (price changes require new price object in Stripe)
      const currentPrice = Math.round(service.price * 100);
      try {
        const existingPrice = service.stripe_price_id 
          ? await stripe.prices.retrieve(service.stripe_price_id, { stripeAccount: stripeAccountId })
          : null;

        if (!existingPrice || existingPrice.unit_amount !== currentPrice) {
          // Create new price
          priceResult = await createStripePrice(service, service.stripe_product_id, stripeAccountId);
          if (!priceResult.success || !priceResult.priceId) {
            await markServiceSyncError(service.id, priceResult.error || 'Failed to create new price');
            return priceResult;
          }
        } else {
          priceResult = {
            success: true,
            priceId: service.stripe_price_id || ''
          };
        }
      } catch {
        // If we can't retrieve the existing price, create a new one
        priceResult = await createStripePrice(service, service.stripe_product_id, stripeAccountId);
        if (!priceResult.success || !priceResult.priceId) {
          await markServiceSyncError(service.id, priceResult.error || 'Failed to create replacement price');
          return priceResult;
        }
      }
    }

    // Determine the target status
    const targetStatus: StripeProductStatus = professionalStatus.shouldBeActive ? 'active' : 'draft';

    // Update product status if needed
    const shouldBeActiveInStripe = targetStatus === 'active';
    if (service.stripe_status !== targetStatus && productResult.productId) {
      const statusResult = await updateStripeProductStatus(
        productResult.productId,
        shouldBeActiveInStripe,
        stripeAccountId
      );
      if (!statusResult.success) {
        await markServiceSyncError(service.id, statusResult.error || 'Failed to update product status');
        return statusResult;
      }
    }

    // Mark sync as successful in database
    if (productResult.productId && priceResult.priceId) {
      await markServiceSyncSuccess(
        service.id,
        productResult.productId,
        priceResult.priceId,
        targetStatus
      );

      return {
        success: true,
        productId: productResult.productId,
        priceId: priceResult.priceId,
        status: targetStatus
      };
    }

    const error = 'Failed to get product or price IDs';
    await markServiceSyncError(service.id, error);
    return {
      success: false,
      error
    };
  } catch (error) {
    console.error('Error syncing service with Stripe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error syncing service';
    
    // Mark sync as failed in database
    await markServiceSyncError(service.id, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Archive a service from Stripe (when service is deleted or subscription ends)
 */
export async function archiveServiceFromStripe(
  service: ServiceWithStripe,
  userId: string
): Promise<StripeSyncResult> {
  try {
    if (!service.stripe_product_id) {
      await markServiceSyncSuccess(service.id, '', '', 'inactive');
      return {
        success: true,
        status: 'inactive'
      };
    }

    // Get professional profile for Stripe account ID
    const profile = await getProfessionalProfileForStripe(userId);
    const stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      // No Stripe account, just mark as archived in our database
      await markServiceSyncSuccess(service.id, service.stripe_product_id, service.stripe_price_id || '', 'inactive');
      return {
        success: true,
        status: 'inactive'
      };
    }

    const result = await archiveStripeProduct(service.stripe_product_id, stripeAccountId);
    
    if (result.success) {
      // Mark as archived in our database
      await markServiceSyncSuccess(
        service.id,
        service.stripe_product_id,
        service.stripe_price_id || '',
        'inactive'
      );
    } else {
      await markServiceSyncError(service.id, result.error || 'Failed to archive product');
    }

    return result;
  } catch (error) {
    console.error('Error archiving service from Stripe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error archiving service';
    
    await markServiceSyncError(service.id, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Sync all services for a professional (when subscription status changes)
 */
export async function syncAllProfessionalServices(userId: string): Promise<{
  totalServices: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}> {
  try {
    const profile = await getProfessionalProfileForStripe(userId);
    if (!profile) {
      return {
        totalServices: 0,
        successCount: 0,
        errorCount: 1,
        errors: ['Professional profile not found']
      };
    }

    // Get all services for this professional
    const { getServicesForProfessional } = await import('./db');
    const services = await getServicesForProfessional(profile.id);

    const result = {
      totalServices: services.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[]
    };

    // Sync each service
    for (const service of services) {
      const syncResult = await syncServiceWithStripe(service, userId);
      
      if (syncResult.success) {
        result.successCount++;
      } else {
        result.errorCount++;
        result.errors.push(`${service.name}: ${syncResult.error || 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    console.error('Error syncing all professional services:', error);
    return {
      totalServices: 0,
      successCount: 0,
      errorCount: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
} 