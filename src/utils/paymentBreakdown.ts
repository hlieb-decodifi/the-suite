/**
 * Payment breakdown utilities for booking payments
 * Handles service fee inclusion/exclusion logic for different user roles
 */

import { formatCurrency } from './formatCurrency';

type PaymentBreakdownInput = {
  bookingServices: Array<{ price: number }>;
  bookingPayment: {
    tip_amount: number;
    service_fee: number;
    deposit_amount: number;
    balance_amount: number;
  };
  includeServiceFee: boolean;
  formatAsCurrency?: boolean;
};

type PaymentBreakdownResult = {
  servicesSubtotal: number | string;
  tips: number | string;
  serviceFee?: number | string;
  deposit: number | string;
  balance: number | string;
  total: number | string;
};

/**
 * Calculates payment breakdown with proper service fee handling
 *
 * @param bookingServices - Array of booking services to calculate subtotal
 * @param bookingPayment - Booking payment data containing amounts and fees
 * @param includeServiceFee - Whether to include service fee in breakdown (true for clients, false for professionals)
 * @param formatAsCurrency - Whether to format numbers as currency strings
 * @returns Object containing breakdown values
 *
 * @example
 * ```typescript
 * // For client view (include service fee)
 * const breakdown = calculatePaymentBreakdown({
 *   bookingServices: services,
 *   bookingPayment: payment,
 *   includeServiceFee: true,
 *   formatAsCurrency: true
 * });
 *
 * // For professional view (exclude service fee)
 * const breakdown = calculatePaymentBreakdown({
 *   bookingServices: services,
 *   bookingPayment: payment,
 *   includeServiceFee: false
 * });
 * ```
 */
export function calculatePaymentBreakdown({
  bookingServices,
  bookingPayment,
  includeServiceFee,
  formatAsCurrency = false,
}: PaymentBreakdownInput): PaymentBreakdownResult {
  // Calculate services subtotal
  const servicesSubtotal = bookingServices.reduce(
    (sum, service) => sum + service.price,
    0,
  );

  const tips = bookingPayment.tip_amount;
  const serviceFee = bookingPayment.service_fee;
  const depositAmount = bookingPayment.deposit_amount;
  const balanceAmount = bookingPayment.balance_amount;

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

  // Calculate total
  const total = balance + deposit + tips;

  // Format as currency if requested
  if (formatAsCurrency) {
    const result: PaymentBreakdownResult = {
      servicesSubtotal: formatCurrency(servicesSubtotal),
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
    servicesSubtotal,
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
