// Default template IDs for fallback (will be replaced by database values)
export const DEFAULT_TEMPLATE_IDS = {
  // Booking related
  BOOKING_CANCELLATION_CLIENT: 15,
  BOOKING_CANCELLATION_PROFESSIONAL: 14,
  BOOKING_CONFIRMATION_CLIENT: 18,
  BOOKING_CONFIRMATION_PROFESSIONAL: 19,
  
  // Payment related
  PAYMENT_CONFIRMATION_CLIENT: 20,
  PAYMENT_CONFIRMATION_PROFESSIONAL: 21,
  BALANCE_NOTIFICATION: 22,
  
  // Refund related
  REFUND_REQUEST_PROFESSIONAL: 24,
  REFUND_COMPLETION_CLIENT: 23,
  REFUND_COMPLETION_PROFESSIONAL: 25,
  REFUND_DECLINE_CLIENT: 26,
  
  // Review related
  REVIEW_TIP_NOTIFICATION: 27,
  
  // Contact related
  CONTACT_INQUIRY_ADMIN: 28,
  CONTACT_INQUIRY_CONFIRMATION: 29,
  
  // Policy related
  CANCELLATION_POLICY_CHARGE_CLIENT: 30,
  CANCELLATION_POLICY_CHARGE_PROFESSIONAL: 31,
  
  // Incident related
  NO_SHOW_NOTIFICATION_CLIENT: 32,
  NO_SHOW_NOTIFICATION_PROFESSIONAL: 33,
}

// This proxy uses the database values when available, falling back to defaults
export const TEMPLATE_IDS = new Proxy(DEFAULT_TEMPLATE_IDS, {
  get: function(target, prop) {
    // For server-side, we'll load from database
    if (typeof window === 'undefined') {
      // We can't use async/await here, so we'll return the default value
      // The actual template functions will fetch and use the correct values
      return target[prop as keyof typeof target];
    }
    // For client-side, just use defaults
    return target[prop as keyof typeof target];
  }
}); 