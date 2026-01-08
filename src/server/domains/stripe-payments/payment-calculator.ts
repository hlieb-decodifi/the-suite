/**
 * Payment Calculator Module
 *
 * Pure calculation function that determines all payment data upfront.
 * Consolidates logic from handleUnifiedPaymentFlow into a single calculation.
 *
 * This eliminates the need for multiple database updates by computing
 * all payment fields before inserting the booking_payments record.
 */

import type { ProfessionalProfileForPayment } from './types';
import { createClient } from '@/lib/supabase/server';

/**
 * Complete payment data for booking_payments record
 */
export type CompletePaymentData = {
  // Amounts (in dollars for DB)
  amount: number;
  deposit_amount: number;
  balance_amount: number;
  tip_amount: number;
  service_fee: number;

  // Status and type
  status: 'pending' | 'completed' | 'authorized';
  payment_type: 'full' | 'deposit' | 'balance';
  requires_balance_payment: boolean;

  // Scheduling (null if immediate)
  capture_scheduled_for: string | null;
  pre_auth_scheduled_for: string | null;

  // Stripe session configuration
  stripeCheckoutType:
    | 'setup_only'
    | 'deposit'
    | 'full'
    | 'immediate_uncaptured';
  stripeAmount: number; // Amount in cents to pass to Stripe (may differ for cash)
  useUncapturedPayment: boolean;

  // Metadata for Stripe session
  paymentFlow: string;
  appointmentTiming: 'immediate' | 'scheduled';
};

/**
 * Calculate all payment data upfront based on booking scenario
 *
 * Handles three main scenarios:
 * 1. Deposit required - calculate deposit + balance with schedule
 * 2. No deposit, >6 days - setup intent with scheduled payment
 * 3. No deposit, ≤6 days - immediate uncaptured payment
 */
export async function calculateCompletePaymentData(params: {
  totalPrice: number; // in dollars
  tipAmount: number; // in dollars
  serviceFee: number; // in cents
  professionalProfile: ProfessionalProfileForPayment;
  appointmentStartTime: Date;
  appointmentEndTime: Date;
  isOnlinePayment: boolean;
}): Promise<CompletePaymentData> {
  const {
    totalPrice,
    tipAmount,
    serviceFee: serviceFeeInCents,
    professionalProfile,
    appointmentStartTime,
    appointmentEndTime,
    isOnlinePayment,
  } = params;

  // Convert to cents for calculations
  const totalAmountCents = Math.round(totalPrice * 100);
  const tipAmountCents = Math.round(tipAmount * 100);
  const serviceFee = serviceFeeInCents;
  const serviceAmountCents = totalAmountCents - serviceFee - tipAmountCents;

  // Calculate payment amounts (deposit vs full)
  const paymentCalculation = await calculatePaymentAmounts(
    totalAmountCents,
    professionalProfile,
    serviceAmountCents,
  );

  // Calculate days until appointment
  const daysUntilAppointment = Math.ceil(
    (appointmentStartTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const shouldUseSetupIntent = daysUntilAppointment > 6;

  // SCENARIO 1: Deposit Required
  if (
    paymentCalculation.requiresDeposit &&
    paymentCalculation.depositAmount > 0
  ) {
    const scheduleResult = await calculatePaymentSchedule(
      appointmentStartTime,
      appointmentEndTime,
    );

    if (!scheduleResult.success) {
      throw new Error(
        scheduleResult.error || 'Failed to calculate payment schedule',
      );
    }

    // When appointment is < 7 days away (immediate), balance payment is created immediately
    // in webhook handler, so pre_auth_scheduled_for should be null to prevent cron job processing
    const isImmediate = scheduleResult.shouldPreAuthNow;

    return {
      // Amounts (convert to dollars)
      amount: totalAmountCents / 100,
      deposit_amount: paymentCalculation.depositAmount / 100,
      balance_amount: paymentCalculation.balanceAmount / 100,
      tip_amount: tipAmount,
      service_fee: serviceFee / 100,

      // Status
      status: 'pending',
      payment_type: 'deposit',
      requires_balance_payment: true,

      // Schedule (only for online payments that need pre-auth)
      // For immediate payments: capture_scheduled_for is set, pre_auth_scheduled_for is null
      // For scheduled payments: both are set
      capture_scheduled_for: isOnlinePayment
        ? scheduleResult.captureDate!.toISOString()
        : null,
      pre_auth_scheduled_for:
        isOnlinePayment && !isImmediate
          ? scheduleResult.preAuthDate!.toISOString()
          : null,

      // Stripe configuration
      stripeCheckoutType: 'setup_only',
      stripeAmount: paymentCalculation.totalAmount, // Full amount for display
      useUncapturedPayment: false,

      // Metadata
      paymentFlow: 'setup_for_deposit_and_balance',
      appointmentTiming: isImmediate ? 'immediate' : 'scheduled',
    };
  }

  // SCENARIO 2: No Deposit + >6 Days Away
  if (shouldUseSetupIntent) {
    const scheduleResult = await calculatePaymentSchedule(
      appointmentStartTime,
      appointmentEndTime,
    );

    if (!scheduleResult.success) {
      throw new Error(
        scheduleResult.error || 'Failed to calculate payment schedule',
      );
    }

    // Determine amount: card = full, cash = service fee only
    const scheduledAmount = isOnlinePayment ? totalAmountCents : serviceFee;

    return {
      // Amounts (convert to dollars)
      amount: scheduledAmount / 100,
      deposit_amount: 0,
      balance_amount: paymentCalculation.balanceAmount / 100,
      tip_amount: tipAmount,
      service_fee: serviceFee / 100,

      // Status
      status: 'pending',
      payment_type: 'full',
      requires_balance_payment:
        paymentCalculation.requiresBalancePayment && isOnlinePayment,

      // Schedule - BOTH online and cash need scheduling here
      // Online: Full amount via Stripe
      // Cash: Service fee via Stripe (balance paid in cash at appointment)
      capture_scheduled_for: scheduleResult.captureDate!.toISOString(),
      pre_auth_scheduled_for: scheduleResult.preAuthDate!.toISOString(),

      // Stripe configuration
      stripeCheckoutType: 'setup_only',
      stripeAmount: scheduledAmount,
      useUncapturedPayment: false,

      // Metadata
      paymentFlow: 'setup_for_future_auth',
      appointmentTiming: 'scheduled',
    };
  }

  // SCENARIO 3: No Deposit + ≤6 Days Away
  // Immediate payment with uncaptured intent
  const immediateAmount = isOnlinePayment ? totalAmountCents : serviceFee;

  return {
    // Amounts (convert to dollars)
    amount: immediateAmount / 100,
    deposit_amount: 0,
    balance_amount: paymentCalculation.balanceAmount / 100,
    tip_amount: tipAmount,
    service_fee: serviceFee / 100,

    // Status
    status: 'pending',
    payment_type: paymentCalculation.isFullPayment ? 'full' : 'deposit',
    // Card payments require balance payment tracking (full payment created as uncaptured)
    // Cash payments don't require balance payment (only service fee charged upfront)
    requires_balance_payment: isOnlinePayment,

    // Schedule
    // Capture should happen at appointment end time (set by webhook/checkout handler)
    // Pre-auth is immediate (no scheduling needed), so pre_auth_scheduled_for is null
    capture_scheduled_for: appointmentEndTime.toISOString(),
    pre_auth_scheduled_for: null,

    // Stripe configuration
    stripeCheckoutType: 'immediate_uncaptured',
    stripeAmount: immediateAmount,
    useUncapturedPayment: true,

    // Metadata
    paymentFlow: isOnlinePayment
      ? 'immediate_full_payment'
      : 'immediate_service_fee_only',
    appointmentTiming: 'immediate',
  };
}

/**
 * Calculate payment amounts (deposit vs full payment)
 * Extracted from db.ts calculatePaymentAmounts
 */
async function calculatePaymentAmounts(
  totalAmount: number, // in cents
  professionalProfile: ProfessionalProfileForPayment,
  serviceAmount: number, // service amount only (without tips or fees) - in cents
): Promise<{
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  requiresDeposit: boolean;
  requiresBalancePayment: boolean;
  isFullPayment: boolean;
}> {
  const { requires_deposit, deposit_type, deposit_value } = professionalProfile;

  // Get service fee from config
  const { getServiceFeeFromConfig } = await import(
    '@/server/domains/stripe-payments/config'
  );
  const serviceFee = await getServiceFeeFromConfig();

  if (!requires_deposit || !deposit_value) {
    // No deposit required - full payment
    return {
      totalAmount,
      depositAmount: 0,
      balanceAmount: totalAmount,
      requiresDeposit: false,
      requiresBalancePayment: true,
      isFullPayment: true,
    };
  }

  let depositAmount: number;

  if (deposit_type === 'percentage') {
    // Calculate deposit based on service amount only (excluding tips and fees)
    depositAmount = Math.round(serviceAmount * (deposit_value / 100));
    // Enforce minimum deposit of $1 (100 cents)
    depositAmount = Math.max(depositAmount, 100);
  } else {
    // Fixed amount deposit - if it's bigger than service amount, cap it
    depositAmount = Math.min(
      Math.round(deposit_value * 100), // Convert to cents
      serviceAmount, // Cap at service amount
    );
    // Enforce minimum deposit of $1 (100 cents)
    depositAmount = Math.max(depositAmount, 100);
  }

  // Add service fee to deposit (service fee charged upfront)
  depositAmount += serviceFee;

  // Balance amount: remaining service + tips (service fee already in deposit)
  const balanceAmount = totalAmount - depositAmount;

  return {
    totalAmount,
    depositAmount,
    balanceAmount,
    requiresDeposit: true,
    requiresBalancePayment: balanceAmount > 0,
    isFullPayment: depositAmount >= serviceAmount,
  };
}

/**
 * Calculate payment schedule (pre-auth and capture dates)
 * Calls database RPC function
 */
async function calculatePaymentSchedule(
  appointmentStartTime: Date,
  appointmentEndTime: Date,
): Promise<{
  success: boolean;
  preAuthDate?: Date;
  captureDate?: Date;
  shouldPreAuthNow?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('calculate_payment_schedule', {
        appointment_start_time: appointmentStartTime.toISOString(),
        appointment_end_time: appointmentEndTime.toISOString(),
      })
      .single();

    if (error) {
      console.error('Error calculating payment schedule:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      preAuthDate: new Date(data.pre_auth_date),
      captureDate: new Date(data.capture_date),
      shouldPreAuthNow: data.should_pre_auth_now,
    };
  } catch (error) {
    console.error('Error in calculatePaymentSchedule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
