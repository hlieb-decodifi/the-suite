import type { Database } from '@/../supabase/types';

// Database types
type BookingPaymentDB = Database['public']['Tables']['booking_payments']['Row'];

// Booking payment with Stripe information
export type BookingPaymentWithStripe = BookingPaymentDB;

// Professional profile for payment processing
export type ProfessionalProfileForPayment = {
  id: string;
  user_id: string;
  requires_deposit: boolean;
  deposit_type: 'percentage' | 'fixed';
  deposit_value: number | null;
  stripe_account_id: string | null;
  stripe_connect_status: 'not_connected' | 'pending' | 'in_review' | 'complete';
};

// Payment calculation result
export type PaymentCalculation = {
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  requiresDeposit: boolean;
  requiresBalancePayment: boolean;
  isFullPayment: boolean; // true if deposit >= total amount
};

// Stripe checkout session creation parameters
export type StripeCheckoutParams = {
  bookingId: string;
  clientId: string;
  professionalStripeAccountId: string;
  amount: number; // in cents
  depositAmount?: number; // in cents
  balanceAmount?: number; // in cents
  paymentType: 'full' | 'deposit' | 'setup_only';
  requiresBalancePayment: boolean;
  metadata: Record<string, string>;
};

// Stripe checkout session result
export type StripeCheckoutResult = {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
};

// Payment processing result
export type PaymentProcessingResult = {
  success: boolean;
  bookingId?: string;
  checkoutUrl?: string;
  requiresPayment: boolean;
  paymentType: 'full' | 'deposit' | 'setup_only';
  error?: string;
};

// Booking creation with payment data
export type BookingWithPaymentData = {
  bookingId: string;
  totalPrice: number;
  paymentCalculation: PaymentCalculation;
  professionalProfile: ProfessionalProfileForPayment;
};
