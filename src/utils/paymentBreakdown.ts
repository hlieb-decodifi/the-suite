/**
 * Payment breakdown utilities for booking payments
 * Handles service fee inclusion/exclusion logic for different user roles
 */

import { formatCurrency } from './formatCurrency';

type PaymentBreakdownInput = {
  bookingPayment: {
    tip_amount?: number | null;
    service_fee?: number | null;
    deposit_amount?: number | null;
    balance_amount?: number | null;
  };
  includeServiceFee: boolean;
  formatAsCurrency?: boolean;
};

type PaymentBreakdownResult = {
  tips: number | string;
  serviceFee?: number | string;
  deposit: number | string;
  balance: number | string;
  total: number | string;
};

/**
 * Calculates payment breakdown with proper service fee handling
 *
 * @param bookingPayment - Booking payment data containing amounts and fees
 * @param includeServiceFee - Whether to include service fee in breakdown (true for clients, false for professionals)
 * @param formatAsCurrency - Whether to format numbers as currency strings
 * @returns Object containing breakdown values
 *
 * @example
 * ```typescript
 * // For client view (include service fee)
 * const breakdown = calculatePaymentBreakdown({
 *   bookingPayment: payment,
 *   includeServiceFee: true,
 *   formatAsCurrency: true
 * });
 *
 * // For professional view (exclude service fee)
 * const breakdown = calculatePaymentBreakdown({
 *   bookingPayment: payment,
 *   includeServiceFee: false
 * });
 * ```
 */
export function calculatePaymentBreakdown({
  bookingPayment,
  includeServiceFee,
  formatAsCurrency = false,
}: PaymentBreakdownInput): PaymentBreakdownResult {
  const tips = bookingPayment.tip_amount ?? 0;
  const serviceFee = bookingPayment.service_fee ?? 0;
  const depositAmount = bookingPayment.deposit_amount ?? 0;
  const balanceAmount = bookingPayment.balance_amount ?? 0;

  // `balance_amount` from the database includes tips. For the breakdown, we separate them.
  const balanceWithoutTips = balanceAmount - tips;

  let deposit = depositAmount;
  let balance = balanceWithoutTips;

  // For the professional's view, we must deduct the service fee from their earnings.
  if (!includeServiceFee) {
    let feeToDeduct = serviceFee;

    // Prioritize deducting fee from deposit.
    const feeFromDeposit = Math.min(deposit, feeToDeduct);
    deposit -= feeFromDeposit;
    feeToDeduct -= feeFromDeposit;

    // Deduct any remaining fee from the balance.
    if (feeToDeduct > 0) {
      balance -= feeToDeduct;
    }

    // Ensure values don't go negative.
    deposit = Math.max(0, deposit);
    balance = Math.max(0, balance);
  }

  // The final total is the sum of the adjusted components.
  const total = deposit + balance + tips;

  // Format as currency if requested
  if (formatAsCurrency) {
    const result: PaymentBreakdownResult = {
      tips: formatCurrency(tips),
      deposit: formatCurrency(deposit),
      balance: formatCurrency(balance),
      total: formatCurrency(total),
    };

    if (includeServiceFee) {
      result.serviceFee = formatCurrency(serviceFee);
    }

    return result;
  }

  // Return as numbers
  const result: PaymentBreakdownResult = {
    tips,
    deposit,
    balance,
    total,
  };

  if (includeServiceFee) {
    result.serviceFee = serviceFee;
  }

  return result;
}
