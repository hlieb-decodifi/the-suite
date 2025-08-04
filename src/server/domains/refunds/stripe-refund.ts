/**
 * Legacy Stripe refund processing - now handled through support requests
 */

/**
 * Process a Stripe refund
 * This is now handled through the support request system
 */
export async function processStripeRefund(refundId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`Stripe refund ${refundId} - migrated to support requests`);
  return {
    success: false,
    error: 'Stripe refund processing has been migrated to Support Requests',
  };
}

/**
 * Get refund status from Stripe
 * This is now handled through the support request system
 */
export async function getStripeRefundStatus(refundId: string): Promise<{ status?: string; error?: string }> {
  console.log(`Stripe refund status ${refundId} - migrated to support requests`);
  return {
    error: 'Stripe refund status checking has been migrated to Support Requests',
  };
}

/**
 * Handle Stripe refund webhook
 * This is now handled through the support request system
 */
export async function handleStripeRefundWebhook(refund: unknown): Promise<{ success: boolean; error?: string }> {
  console.log(`Stripe refund webhook ${(refund as { id?: string })?.id} - migrated to support requests`);
  return {
    success: false,
    error: 'Stripe refund webhooks have been migrated to Support Requests',
  };
}
