import { stripe } from '@/lib/stripe/server';

export type CancellationPaymentResult = {
  depositRefunded: boolean;
  balanceCancelled: boolean;
  chargeAmount: number;
  error?: string;
};

export type PaymentData = {
  id: string;
  amount: number;
  tip_amount: number;
  service_fee: number;
  deposit_amount: number;
  balance_amount: number;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  deposit_payment_intent_id: string | null;
  status: string;
  pre_auth_scheduled_for: string | null;
  capture_scheduled_for: string | null;
};

export type ProfessionalProfile = {
  cancellation_policy_enabled: boolean;
  cancellation_24h_charge_percentage: number;
  cancellation_48h_charge_percentage: number;
  professional_stripe_connect?: {
    stripe_account_id: string | null;
  } | null;
};

/**
 * Handle cancellation for the new dual payment structure (deposit + balance)
 * Implements proper cancellation policy based on total booking amount
 */
export async function handleDualPaymentCancellation(
  payment: PaymentData,
  appointment: { start_time: string },
  booking: { id: string },
  professionalProfile: ProfessionalProfile | null,
  isProfessional: boolean,
  userId: string,
  cancellationReason: string,
  forcePolicy: boolean = false, // For cancelWithPolicyAction
): Promise<CancellationPaymentResult> {
  console.log(
    `[Dual Payment Cancellation] Starting cancellation for dual payment structure`,
  );
  console.log(`[Dual Payment Cancellation] Payment info:`, {
    paymentId: payment.id,
    depositPaymentIntentId: payment.deposit_payment_intent_id,
    balancePaymentIntentId: payment.stripe_payment_intent_id,
    depositAmount: payment.deposit_amount,
    balanceAmount: payment.balance_amount || payment.amount,
    totalAmount: payment.amount + (payment.tip_amount || 0),
    isProfessional,
  });

  let depositRefunded = false;
  let balanceCancelled = false;
  let chargeAmount = 0;

  try {
    // Calculate cancellation policy first based on TOTAL booking amount
    const appointmentStartTime = new Date(appointment.start_time);
    const now = new Date();
    const hoursUntilAppointment =
      (appointmentStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let chargePercentage = 0;
    let isWithinPolicyPeriod = false;

    // Only apply policy for client cancellations or when forced
    if (
      professionalProfile &&
      professionalProfile.cancellation_policy_enabled &&
      (!isProfessional || forcePolicy)
    ) {
      console.log(
        `[Policy] Checking cancellation policy - Hours until appointment: ${hoursUntilAppointment.toFixed(1)}`,
      );

      if (hoursUntilAppointment < 24) {
        chargePercentage =
          professionalProfile.cancellation_24h_charge_percentage || 50;
        isWithinPolicyPeriod = true;
      } else if (hoursUntilAppointment < 48) {
        chargePercentage =
          professionalProfile.cancellation_48h_charge_percentage || 25;
        isWithinPolicyPeriod = true;
      }
      // >48 hours: no policy applies (chargePercentage = 0)
    }

    // Calculate service amount for policy calculation (excluding service fee)
    // payment.amount includes service price + tip, payment.service_fee is suite's platform fee
    const servicePriceAmount = payment.amount + (payment.tip_amount || 0); // Service price + tip (what professional gets)
    const serviceFee = payment.service_fee || 0; // Suite's platform fee (always returned to client)
    const totalCancellationFee = Math.round(
      servicePriceAmount * (chargePercentage / 100) * 100,
    ); // Convert to cents

    console.log(`[Policy] Cancellation policy calculation:`, {
      hoursUntilAppointment: hoursUntilAppointment.toFixed(1),
      chargePercentage,
      isWithinPolicyPeriod,
      servicePriceAmount,
      serviceFee,
      totalCancellationFee: totalCancellationFee / 100,
      isProfessional,
    });

    if (isWithinPolicyPeriod && chargePercentage > 0) {
      // SCENARIO: Cancellation policy applies (24-48h or <24h)
      console.log(
        `[Policy Cancellation] Applying cancellation policy: ${chargePercentage}% fee`,
      );

      await handlePolicyCancellation(
        payment,
        totalCancellationFee,
        booking.id,
        userId,
        professionalProfile,
        cancellationReason,
      );

      chargeAmount = totalCancellationFee / 100;
      depositRefunded = true; // Deposit is still refunded, but balance captures the fee
      balanceCancelled = true;
    } else {
      // SCENARIO: No policy applies (>48h or professional cancelling)
      console.log(
        `[No Policy] No cancellation policy applies - full refund/cancellation`,
      );

      await handleNoPolicyCancellation(
        payment,
        booking.id,
        cancellationReason,
        isProfessional,
      );

      chargeAmount = 0;
      depositRefunded = true;
      balanceCancelled = true;
    }

    console.log(`[Dual Payment Cancellation] Summary:`, {
      depositRefunded,
      balanceCancelled,
      chargeAmount,
      totalRefunded: servicePriceAmount - chargeAmount,
    });

    return {
      depositRefunded,
      balanceCancelled,
      chargeAmount,
    };
  } catch (error) {
    console.error(
      '[Dual Payment Cancellation] ❌ Error during cancellation:',
      error,
    );
    return {
      depositRefunded,
      balanceCancelled,
      chargeAmount,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during cancellation',
    };
  }
}

/**
 * Handle cancellation when policy applies (24-48h or <24h)
 * Applies cancellation fee proportionally to both deposit and balance
 * Always returns suite fee to client
 */
async function handlePolicyCancellation(
  payment: PaymentData,
  totalCancellationFeeInCents: number,
  bookingId: string,
  userId: string,
  professionalProfile: ProfessionalProfile | null,
  cancellationReason: string,
): Promise<void> {
  console.log(`[Policy Cancellation] Processing policy-based cancellation`);

  // Calculate proportional cancellation fees
  const depositAmount = (payment.deposit_amount || 0) * 100; // Convert to cents
  const serviceFeeInCents = (payment.service_fee || 0) * 100; // Suite fee in cents
  const servicePriceInCents =
    (payment.amount + (payment.tip_amount || 0)) * 100; // Service price + tip in cents

  // Calculate proportional cancellation fees
  let depositCancellationFee = 0;
  let balanceCancellationFee = 0;

  if (depositAmount > 0) {
    // Proportional split: deposit fee = (deposit / service price) * total cancellation fee
    depositCancellationFee = Math.round(
      (depositAmount / servicePriceInCents) * totalCancellationFeeInCents,
    );
    balanceCancellationFee =
      totalCancellationFeeInCents - depositCancellationFee;
  } else {
    // No deposit: all cancellation fee comes from balance
    balanceCancellationFee = totalCancellationFeeInCents;
  }

  console.log(`[Policy Cancellation] Fee breakdown:`, {
    servicePriceInCents: servicePriceInCents / 100,
    depositAmount: depositAmount / 100,
    serviceFee: serviceFeeInCents / 100,
    totalCancellationFee: totalCancellationFeeInCents / 100,
    depositCancellationFee: depositCancellationFee / 100,
    balanceCancellationFee: balanceCancellationFee / 100,
  });

  // Step 1: Handle deposit - partial refund (deposit - deposit cancellation fee)
  if (payment.deposit_payment_intent_id && depositAmount > 0) {
    console.log(
      `[Policy Deposit] Processing deposit: ${payment.deposit_payment_intent_id}`,
    );

    try {
      const depositPaymentIntent = await stripe.paymentIntents.retrieve(
        payment.deposit_payment_intent_id,
      );

      if (depositPaymentIntent.status === 'succeeded') {
        // Partial refund: refund (deposit - cancellation fee)
        const depositRefundAmount = depositAmount - depositCancellationFee;

        if (depositRefundAmount > 0) {
          const depositRefund = await stripe.refunds.create({
            payment_intent: payment.deposit_payment_intent_id,
            amount: depositRefundAmount,
            metadata: {
              booking_id: bookingId,
              reason: `Partial deposit refund - Policy cancellation: ${cancellationReason}`,
            },
          });
          console.log(
            `[Policy Deposit] ✅ Partial deposit refund: $${depositRefund.amount / 100} (kept $${depositCancellationFee / 100} as cancellation fee)`,
          );
        } else {
          console.log(
            `[Policy Deposit] ✅ No deposit refund - full amount kept as cancellation fee`,
          );
        }
      } else if (depositPaymentIntent.status === 'requires_capture') {
        // Partial capture: capture only the cancellation fee
        if (depositCancellationFee > 0) {
          const captureResult = await stripe.paymentIntents.capture(
            payment.deposit_payment_intent_id,
            {
              amount_to_capture: depositCancellationFee,
            },
          );
          console.log(
            `[Policy Deposit] ✅ Partial deposit capture: $${captureResult.amount_received / 100} as cancellation fee`,
          );
        } else {
          // Cancel if no fee to capture
          await stripe.paymentIntents.cancel(payment.deposit_payment_intent_id);
          console.log(
            `[Policy Deposit] ✅ Cancelled uncaptured deposit (no fee)`,
          );
        }
      }
    } catch (error) {
      console.error('[Policy Deposit] ❌ Failed to handle deposit:', error);
      throw new Error(
        `Failed to handle deposit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Step 2: Handle balance - capture cancellation fee from balance portion, always return suite fee
  if (payment.stripe_payment_intent_id) {
    console.log(
      `[Policy Balance] Processing balance payment: ${payment.stripe_payment_intent_id}`,
    );

    try {
      const balancePaymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
      );

      if (balancePaymentIntent.status === 'requires_capture') {
        // Balance payment includes: remaining service amount + suite fee
        // We need to: capture (balance cancellation fee) + return (remaining service amount + suite fee)

        const balanceAmount = balancePaymentIntent.amount;

        // What we capture: only the balance portion of the cancellation fee
        // The suite fee should always be returned to the client
        const totalCaptureAmount = balanceCancellationFee; // Only capture the cancellation fee portion

        console.log(`[Policy Balance] Capture calculation breakdown:`, {
          balanceAmount: balanceAmount / 100,
          balanceCancellationFee: balanceCancellationFee / 100,
          serviceFee: serviceFeeInCents / 100,
          totalCaptureAmount: totalCaptureAmount / 100,
          clientRefund: (balanceAmount - totalCaptureAmount) / 100, // Remaining service + suite fee
        });

        if (totalCaptureAmount > 0 && totalCaptureAmount < balanceAmount) {
          try {
            // Partial capture: capture only the cancellation fee
            const captureResult = await stripe.paymentIntents.capture(
              payment.stripe_payment_intent_id,
              {
                amount_to_capture: totalCaptureAmount,
              },
            );

            console.log(
              `[Policy Balance] ✅ Partial capture successful: $${captureResult.amount_received / 100} (client gets back $${(balanceAmount - totalCaptureAmount) / 100})`,
            );
          } catch (captureError) {
            console.log(
              `[Policy Balance] Partial capture failed, using dual charge approach:`,
              captureError,
            );

            // Fallback: Cancel uncaptured payment and create separate charge for cancellation fee
            await stripe.paymentIntents.cancel(
              payment.stripe_payment_intent_id,
            );
            console.log(
              `[Policy Balance] ✅ Cancelled uncaptured payment intent`,
            );

            // Create separate charge for only the cancellation fee (not including suite fee)
            if (balanceCancellationFee > 0) {
              await createSeparateCancellationCharge(
                payment,
                balanceCancellationFee,
                bookingId,
                userId,
                professionalProfile,
                cancellationReason,
              );
            }
          }
        } else if (totalCaptureAmount >= balanceAmount) {
          // Capture the full balance if cancellation fee >= balance amount
          const captureResult = await stripe.paymentIntents.capture(
            payment.stripe_payment_intent_id,
          );
          console.log(
            `[Policy Balance] ✅ Full capture: $${captureResult.amount_received / 100} (cancellation fee >= balance)`,
          );
        } else {
          // No fee to capture from balance, cancel the payment
          await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
          console.log(
            `[Policy Balance] ✅ Cancelled uncaptured payment (no balance cancellation fee)`,
          );
        }
      } else if (balancePaymentIntent.status === 'succeeded') {
        // Balance already captured - need to refund the non-fee portion
        // Refund: full balance - balance cancellation fee (suite fee should be refunded)
        const balanceAmount = balancePaymentIntent.amount;
        const refundAmount = balanceAmount - balanceCancellationFee;

        if (refundAmount > 0) {
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            amount: refundAmount,
            metadata: {
              booking_id: bookingId,
              reason: `Partial refund - Policy cancellation: ${cancellationReason}`,
            },
          });
          console.log(
            `[Policy Balance] ✅ Partial refund processed: $${refund.amount / 100} (kept $${balanceCancellationFee / 100} as cancellation fee)`,
          );
        } else {
          console.log(
            `[Policy Balance] ✅ No refund - full balance kept as cancellation fee`,
          );
        }
      } else {
        console.log(
          `[Policy Balance] Payment in status ${balancePaymentIntent.status} - no action needed`,
        );
      }
    } catch (error) {
      console.error(
        '[Policy Balance] ❌ Failed to handle balance payment:',
        error,
      );
      throw new Error(
        `Failed to handle balance payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Handle cancellation when no policy applies (>48h or professional cancelling)
 * Refunds deposit completely, cancels uncaptured balance completely
 */
async function handleNoPolicyCancellation(
  payment: PaymentData,
  bookingId: string,
  cancellationReason: string,
  isProfessional: boolean,
): Promise<void> {
  console.log(`[No Policy Cancellation] Processing full refund/cancellation`);

  // Step 1: Handle deposit - full refund
  if (payment.deposit_payment_intent_id && (payment.deposit_amount || 0) > 0) {
    console.log(
      `[No Policy Deposit] Processing deposit refund: ${payment.deposit_payment_intent_id}`,
    );

    try {
      const depositPaymentIntent = await stripe.paymentIntents.retrieve(
        payment.deposit_payment_intent_id,
      );

      if (depositPaymentIntent.status === 'succeeded') {
        // Refund the deposit completely
        const depositRefund = await stripe.refunds.create({
          payment_intent: payment.deposit_payment_intent_id,
          metadata: {
            booking_id: bookingId,
            reason: `Full deposit refund - ${isProfessional ? 'Professional' : 'Client'} cancellation: ${cancellationReason}`,
          },
        });
        console.log(
          `[No Policy Deposit] ✅ Deposit refunded: $${depositRefund.amount / 100}`,
        );
      } else if (depositPaymentIntent.status === 'requires_capture') {
        // Cancel uncaptured deposit
        await stripe.paymentIntents.cancel(payment.deposit_payment_intent_id);
        console.log(`[No Policy Deposit] ✅ Uncaptured deposit cancelled`);
      }
    } catch (error) {
      console.error('[No Policy Deposit] ❌ Failed to handle deposit:', error);
      throw new Error(
        `Failed to handle deposit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Step 2: Handle balance - full cancellation or refund
  if (payment.stripe_payment_intent_id) {
    console.log(
      `[No Policy Balance] Processing balance payment: ${payment.stripe_payment_intent_id}`,
    );

    try {
      const balancePaymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
      );

      if (balancePaymentIntent.status === 'requires_capture') {
        // Cancel the entire uncaptured balance payment
        await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
        console.log(
          `[No Policy Balance] ✅ Uncaptured balance payment cancelled`,
        );
      } else if (balancePaymentIntent.status === 'succeeded') {
        // Refund the balance payment (minus service fee for client cancellations)
        const serviceFee = isProfessional
          ? 0
          : (payment.service_fee || 0) * 100; // Convert to cents
        const refundAmount = balancePaymentIntent.amount - serviceFee;

        if (refundAmount > 0) {
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            amount: refundAmount,
            metadata: {
              booking_id: bookingId,
              reason: `Full refund - ${isProfessional ? 'Professional' : 'Client'} cancellation: ${cancellationReason}`,
            },
          });
          console.log(
            `[No Policy Balance] ✅ Balance refunded: $${refund.amount / 100}`,
          );
        }
      } else {
        console.log(
          `[No Policy Balance] Payment in status ${balancePaymentIntent.status} - no action needed`,
        );
      }
    } catch (error) {
      console.error(
        '[No Policy Balance] ❌ Failed to handle balance payment:',
        error,
      );
      throw new Error(
        `Failed to handle balance payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  console.log(`[No Policy Cancellation] ✅ Full refund/cancellation completed`);
}

/**
 * Create a separate charge for cancellation fee when partial capture fails
 */
async function createSeparateCancellationCharge(
  payment: PaymentData,
  chargeAmountInCents: number,
  bookingId: string,
  userId: string,
  professionalProfile: ProfessionalProfile | null,
  cancellationReason: string,
): Promise<void> {
  console.log(
    `[Separate Charge] Creating separate cancellation charge: $${chargeAmountInCents / 100}`,
  );

  try {
    // Get customer ID and payment method
    const { getStripeCustomerId } = await import('../stripe-payments/db');
    const customerId = await getStripeCustomerId(userId);
    const professionalStripeAccount =
      professionalProfile?.professional_stripe_connect?.stripe_account_id ||
      null;

    if (!customerId) {
      throw new Error('Customer ID not found - cannot create separate charge');
    }

    if (!payment.stripe_payment_method_id) {
      throw new Error(
        'Payment method not found - cannot create separate charge',
      );
    }

    // Calculate transfer amount for professional (cancellation fee minus platform service fee)
    const serviceFee = 100; // $1 in cents - Suite's fee
    const cancellationFee = chargeAmountInCents - serviceFee;

    const chargeParams: {
      amount: number;
      currency: string;
      customer: string;
      payment_method: string;
      confirm: boolean;
      off_session: boolean;
      metadata: Record<string, string>;
      transfer_data?: {
        destination: string;
        amount: number;
      };
      on_behalf_of?: string;
    } = {
      amount: chargeAmountInCents,
      currency: 'usd',
      customer: customerId,
      payment_method: payment.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: {
        booking_id: bookingId,
        payment_type: 'cancellation_fee',
        reason: cancellationReason,
      },
    };

    // Only add transfer_data if we have professional account and there's cancellation fee to transfer
    if (professionalStripeAccount && cancellationFee > 0) {
      chargeParams.transfer_data = {
        destination: professionalStripeAccount,
        amount: cancellationFee, // Transfer cancellation fee to professional, service fee stays with platform
      };
      chargeParams.on_behalf_of = professionalStripeAccount;
    }

    const charge = await stripe.paymentIntents.create(chargeParams);

    console.log(
      `[Separate Charge] ✅ Cancellation charge created: ${charge.id} - $${charge.amount / 100}`,
    );
  } catch (error) {
    console.error(
      '[Separate Charge] ❌ Failed to create separate cancellation charge:',
      error,
    );
    // Don't throw here - cancellation should still proceed even if fee charge fails
    console.log(
      `[Separate Charge] ⚠️ Continuing with cancellation despite charge failure`,
    );
  }
}

/**
 * Calculate the correct payment status after cancellation
 */
export function calculatePostCancellationStatus(
  result: CancellationPaymentResult,
  chargeAmount: number,
): string {
  if (result.error) {
    return 'failed';
  }

  if (chargeAmount > 0) {
    return 'partially_refunded';
  }

  if (result.depositRefunded || result.balanceCancelled) {
    return 'refunded';
  }

  return 'cancelled';
}

/**
 * Calculate refund amount for database record
 */
export function calculateRefundAmount(
  payment: PaymentData,
  isProfessional: boolean,
  chargeAmount: number,
): number {
  const totalPaid = payment.amount + (payment.tip_amount || 0);

  if (isProfessional) {
    // Professional gets everything back (no service fee, no cancellation charge)
    return totalPaid;
  } else {
    // Client pays service fee and any cancellation charges
    const serviceFee = payment.service_fee || 0;
    const cancellationCharge = chargeAmount;

    // The refund is what they get back: total paid - service fee - cancellation charges
    const refundAmount = totalPaid - serviceFee - cancellationCharge;

    console.log(`[Refund Calculation] Client refund calculation:`, {
      totalPaid,
      serviceFee,
      cancellationCharge,
      refundAmount: Math.max(0, refundAmount),
    });

    return Math.max(0, refundAmount);
  }
}
