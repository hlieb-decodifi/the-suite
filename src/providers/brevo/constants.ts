export const TEMPLATE_IDS = {
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
} as const; 