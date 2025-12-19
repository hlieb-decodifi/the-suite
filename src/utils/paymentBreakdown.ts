/**
 * Payment Breakdown Utility
 *
 * Handles three payment scenarios based on deposit and payment method:
 *
 * SCENARIO 1: DEPOSIT EXISTS (deposit_amount > 0)
 *   - Service fee is INCLUDED in deposit_amount
 *   - deposit_amount = actual_deposit + service_fee
 *   - balance_amount = remaining_service + tips
 *   - Display: deposit (card) + balance INCLUDING TIPS (card or cash)
 *   - Tips are part of the balance, not a separate line item
 *
 * SCENARIO 2: NO DEPOSIT + CARD PAYMENT (deposit_amount = 0, balancePaymentType = 'card')
 *   - Service fee is PART OF balance_amount
 *   - balance_amount = service_fee + service_amount + tips
 *   - Display: full balance INCLUDING TIPS (card)
 *   - Tips are part of the card balance, not a separate line item
 *
 * SCENARIO 3: NO DEPOSIT + CASH PAYMENT (deposit_amount = 0, balancePaymentType = 'cash')
 *   - Service fee is charged SEPARATELY on card
 *   - balance_amount = service_fee + service_amount + tips
 *   - Display: service_fee (card) + (service_amount + tips) as cash balance
 *   - Tips are part of the cash balance, not a separate line item
 *   - This is the ONLY scenario where serviceFee is shown as a separate line item
 *
 * For professional view (includeServiceFee = false):
 *   - Service fee is deducted from their earnings (from deposit or balance)
 *   - Tips remain included in the balance amounts
 *
 * NOTE: The 'tips' field in the result is for informational purposes only
 * (to show "including $X in tips"). Tips are already included in card/cash balance amounts.
 */

type PaymentBreakdownInput = {
  bookingPayment: {
    tip_amount?: number | null;
    service_fee?: number | null;
    deposit_amount?: number | null;
    balance_amount?: number | null;
  };
  includeServiceFee: boolean;
  balancePaymentType: 'cash' | 'card';
};

type PaymentBreakdownResult = {
  tips: number;
  deposit: number;
  cardBalance: number;
  cashBalance: number;
  total: number;
  serviceFee: number | undefined;
};

export function calculatePaymentBreakdown({
  bookingPayment,
  includeServiceFee,
  balancePaymentType,
}: PaymentBreakdownInput): PaymentBreakdownResult {
  const tips = bookingPayment.tip_amount ?? 0;
  const serviceFee = bookingPayment.service_fee ?? 0;
  const depositAmount = bookingPayment.deposit_amount ?? 0;
  const balanceAmount = bookingPayment.balance_amount ?? 0;

  const isCardBalancePayment = balancePaymentType === 'card';
  const isCashBalancePayment = balancePaymentType === 'cash';

  // Determine where the service fee is located:
  // - If deposit exists: service fee is ALWAYS included in deposit
  // - If no deposit + cash payment: service fee is charged separately on card
  // - If no deposit + card payment: service fee is part of balance
  const hasDeposit = depositAmount > 0;

  let deposit = 0;
  let cardBalance = 0;
  let cashBalance = 0;
  let showServiceFeeSeparately: number | undefined = undefined;

  // SCENARIO 1: Deposit exists (service fee included in deposit)
  if (hasDeposit) {
    if (includeServiceFee) {
      // Client view: show full deposit amount (includes service fee)
      deposit = depositAmount;
    } else {
      // Professional view: deduct service fee from deposit
      deposit = Math.max(0, depositAmount - serviceFee);
    }

    // Balance amount contains remaining service + tips
    // Tips are included in the balance display (card or cash)
    if (isCardBalancePayment) {
      cardBalance = balanceAmount;
    } else {
      cashBalance = balanceAmount;
    }
  }
  // SCENARIO 2 & 3: No deposit
  else {
    // SCENARIO 2: Card payment
    if (isCardBalancePayment) {
      // Card payment: full balance amount charged to card (includes service fee + service + tips)
      if (includeServiceFee) {
        // Client view: show full card balance (includes tips)
        cardBalance = balanceAmount;
      } else {
        // Professional view: deduct service fee from card balance (tips still included)
        cardBalance = Math.max(0, balanceAmount - serviceFee);
      }
    }
    // SCENARIO 3: Cash payment
    else if (isCashBalancePayment) {
      // Cash payment: service fee charged to card, service+tips paid in cash
      // balance_amount = serviceFee (card) + serviceAmount (cash) + tips (cash)

      if (includeServiceFee) {
        // Client view: show service fee on card, rest (including tips) on cash
        showServiceFeeSeparately = serviceFee;
        cardBalance = serviceFee; // Service fee charged to card
        cashBalance = balanceAmount - serviceFee; // Service amount + tips paid in cash
      } else {
        // Professional view: only cash portion (including tips, excluding service fee)
        cardBalance = 0;
        cashBalance = Math.max(0, balanceAmount - serviceFee);
      }
    }
  }

  // Calculate total (tips are already included in card/cash balance)
  const total = deposit + cardBalance + cashBalance;

  return {
    tips,
    deposit,
    cardBalance,
    cashBalance,
    total,
    serviceFee: showServiceFeeSeparately, // Only shown for cash payments without deposit
  };
}
