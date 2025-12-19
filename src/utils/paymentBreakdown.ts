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

  // Return as numbers
  const result: PaymentBreakdownResult = {
    tips,
    deposit,
    cardBalance: isCardBalancePayment ? balance : 0,
    cashBalance: isCashBalancePayment ? balance : 0,
    total,
    serviceFee: includeServiceFee ? serviceFee : undefined,
  };

  // Include service fee as separate line item only when:
  // - includeServiceFee is true (client view)
  // - AND balance is paid by cash
  // - AND there's no deposit (when there's a deposit, service fee is already included in it)
  const shouldShowServiceFeeSeparately =
    includeServiceFee && isCashBalancePayment && depositAmount === 0;

  if (shouldShowServiceFeeSeparately) {
    result.serviceFee = serviceFee;
    result.cashBalance = balanceAmount - serviceFee;
    result.cardBalance = serviceFee;
  }

  return result;
}
