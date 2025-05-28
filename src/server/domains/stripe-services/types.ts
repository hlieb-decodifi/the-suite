import type { Database } from '@/../supabase/types';

// Database types
export type ServiceDB = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];
export type ServiceUpdate = Database['public']['Tables']['services']['Update'];

// Stripe sync status types
export type StripeSyncStatus = 'pending' | 'synced' | 'error';
export type StripeProductStatus = 'draft' | 'active' | 'inactive';

// Professional status evaluation result
export type ProfessionalStripeStatus = {
  shouldSyncToStripe: boolean;
  shouldBeActive: boolean;
  reason: string;
  hasSubscription: boolean;
  isPublished: boolean;
  isStripeConnected: boolean;
  hasCreditCardPayment: boolean;
};

// Service with Stripe information (ServiceDB already includes all Stripe fields)
export type ServiceWithStripe = ServiceDB;

// Stripe sync operation result
export type StripeSyncResult = {
  success: boolean;
  error?: string;
  productId?: string;
  priceId?: string;
  status?: StripeProductStatus;
};

// Stripe product creation parameters
export type StripeProductParams = {
  name: string;
  description?: string;
  metadata: Record<string, string>;
};

// Stripe price creation parameters
export type StripePriceParams = {
  productId: string;
  unitAmount: number; // in cents
  currency: string;
  metadata: Record<string, string>;
};

// Bulk sync operation result
export type BulkSyncResult = {
  totalServices: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    serviceId: string;
    serviceName: string;
    error: string;
  }>;
};

// Service sync queue item
export type ServiceSyncQueueItem = {
  serviceId: string;
  professionalProfileId: string;
  userId: string;
  operation: 'create' | 'update' | 'delete' | 'status_change';
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
  lastError?: string;
};

// Professional profile data for Stripe evaluation
export type ProfessionalProfileForStripe = {
  id: string;
  user_id: string;
  is_published: boolean;
  is_subscribed: boolean;
  stripe_account_id: string | null;
  stripe_connect_status: 'not_connected' | 'pending' | 'complete';
};

// Payment method data
export type PaymentMethodData = {
  id: string;
  name: string;
  is_online: boolean;
}; 