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

  let deposit = depositAmount;
  let balance = balanceAmount;

  // When service fee is excluded (for professionals)
  if (!includeServiceFee) {
    // If there's a deposit, deduct the fee from deposit
    if (depositAmount > 0) {
      deposit = depositAmount - serviceFee;
      // Ensure deposit doesn't go negative
      deposit = Math.max(0, deposit);
    } else {
      // If no deposit, deduct the fee from balance
      balance = balanceAmount - serviceFee;
      // Ensure balance doesn't go negative
      balance = Math.max(0, balance);
    }
  }

  // Calculate total based on deposit, balance, and tips
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
