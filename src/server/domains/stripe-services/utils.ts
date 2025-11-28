import Stripe from 'stripe';

/**
 * Helper function to determine Connect account status based on Stripe account details.
 * Centralizes logic used in webhooks and server actions.
 */
export function determineConnectStatus(
  account: Stripe.Account,
): 'not_connected' | 'pending' | 'in_review' | 'complete' {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'complete';
  }
  if (!account.details_submitted) {
    return 'not_connected';
  }
  if (
    account.requirements?.pending_verification &&
    account.requirements.pending_verification.length > 0
  ) {
    return 'in_review';
  }
  if (
    account.requirements?.currently_due?.length === 0 &&
    account.requirements?.past_due?.length === 0 &&
    account.details_submitted
  ) {
    return 'in_review';
  }
  return 'pending';
}
