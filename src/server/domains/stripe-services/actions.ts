'use server';

import { createClient } from '@/lib/supabase/server';
import { 
  syncServiceWithStripe, 
  syncAllProfessionalServices,
  archiveServiceFromStripe,
  evaluateProfessionalStripeStatus
} from './stripe-operations';
import { 
  getServiceWithStripeData,
  getProfessionalProfileForStripe
} from './db';

/**
 * Server Action: Sync a single service with Stripe
 * Called when a service is created or updated
 */
export async function syncServiceAction(serviceId: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated'
      };
    }

    // Get the service with Stripe data
    const service = await getServiceWithStripeData(serviceId);
    if (!service) {
      return {
        success: false,
        message: 'Service not found',
        error: 'Service not found'
      };
    }

    // Verify the user owns this service
    const profile = await getProfessionalProfileForStripe(user.id);
    if (!profile || profile.id !== service.professional_profile_id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You can only sync your own services'
      };
    }

    // Sync the service
    const result = await syncServiceWithStripe(service, user.id);
    
    if (result.success) {
      return {
        success: true,
        message: `Service "${service.name}" synced successfully with Stripe`
      };
    } else {
      return {
        success: false,
        message: 'Failed to sync service with Stripe',
        error: result.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error in syncServiceAction:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server Action: Sync all services for a professional
 * Called when subscription status changes or user manually triggers sync
 */
export async function syncAllServicesAction(): Promise<{
  success: boolean;
  message: string;
  totalServices: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: 'Authentication required',
        totalServices: 0,
        successCount: 0,
        errorCount: 1,
        errors: ['User not authenticated']
      };
    }

    // Sync all services
    const result = await syncAllProfessionalServices(user.id);
    
    const success = result.errorCount === 0;
    const message = success 
      ? `Successfully synced ${result.successCount} services with Stripe`
      : `Synced ${result.successCount} services, ${result.errorCount} failed`;

    return {
      success,
      message,
      totalServices: result.totalServices,
      successCount: result.successCount,
      errorCount: result.errorCount,
      errors: result.errors
    };
  } catch (error) {
    console.error('Error in syncAllServicesAction:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      totalServices: 0,
      successCount: 0,
      errorCount: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Server Action: Archive a service from Stripe
 * Called when a service is deleted
 */
export async function archiveServiceAction(serviceId: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated'
      };
    }

    // Get the service with Stripe data
    const service = await getServiceWithStripeData(serviceId);
    if (!service) {
      return {
        success: false,
        message: 'Service not found',
        error: 'Service not found'
      };
    }

    // Verify the user owns this service
    const profile = await getProfessionalProfileForStripe(user.id);
    if (!profile || profile.id !== service.professional_profile_id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You can only archive your own services'
      };
    }

    // Archive the service
    const result = await archiveServiceFromStripe(service, user.id);
    
    if (result.success) {
      return {
        success: true,
        message: `Service "${service.name}" archived from Stripe`
      };
    } else {
      return {
        success: false,
        message: 'Failed to archive service from Stripe',
        error: result.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error in archiveServiceAction:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server Action: Get professional's Stripe status
 * Called to check if services should be synced and their target status
 */
export async function getProfessionalStripeStatusAction(): Promise<{
  success: boolean;
  status?: {
    shouldSyncToStripe: boolean;
    shouldBeActive: boolean;
    reason: string;
    hasSubscription: boolean;
    isPublished: boolean;
    isStripeConnected: boolean;
    hasCreditCardPayment: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Get the professional's Stripe status
    const status = await evaluateProfessionalStripeStatus(user.id);
    
    return {
      success: true,
      status
    };
  } catch (error) {
    console.error('Error in getProfessionalStripeStatusAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server Action: Trigger sync when subscription status changes
 * This should be called from subscription webhooks or when subscription changes
 */
export async function onSubscriptionChangeAction(userId: string): Promise<{
  success: boolean;
  message: string;
  syncResult?: {
    totalServices: number;
    successCount: number;
    errorCount: number;
    errors: string[];
  };
}> {
  try {
    // Sync all services for this user
    const syncResult = await syncAllProfessionalServices(userId);
    
    const success = syncResult.errorCount === 0;
    const message = success 
      ? `Subscription change processed: ${syncResult.successCount} services synced`
      : `Subscription change processed: ${syncResult.successCount} synced, ${syncResult.errorCount} failed`;

    return {
      success,
      message,
      syncResult
    };
  } catch (error) {
    console.error('Error in onSubscriptionChangeAction:', error);
    return {
      success: false,
      message: 'Failed to process subscription change',
      syncResult: {
        totalServices: 0,
        successCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
} 