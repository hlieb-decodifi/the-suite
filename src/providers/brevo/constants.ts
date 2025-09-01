export const EMAIL_TEMPLATE_TAGS = {
  // Booking related
  BOOKING_CANCELLATION_CLIENT: 'BookingCancellationClient',
  BOOKING_CANCELLATION_PROFESSIONAL: 'BookingCancellationProfessional',
  BOOKING_CONFIRMATION_CLIENT: 'BookingConfirmationClient',
  BOOKING_CONFIRMATION_PROFESSIONAL: 'BookingConfirmationProfessional',
  
  // Payment related
  PAYMENT_CONFIRMATION_CLIENT: 'PaymentConfirmationClient',
  PAYMENT_CONFIRMATION_PROFESSIONAL: 'PaymentConfirmationProfessional',
  BALANCE_NOTIFICATION: 'BalanceNotification',
  
  // Refund related
  REFUND_REQUEST_PROFESSIONAL: 'RefundRequestProfessional',
  REFUND_COMPLETION_CLIENT: 'RefundCompletionClient',
  REFUND_COMPLETION_PROFESSIONAL: 'RefundCompletionProfessional',
  REFUND_DECLINE_CLIENT: 'RefundDeclineClient',
  
  // Review related
  REVIEW_TIP_NOTIFICATION: 'ReviewTipNotification',
  
  // Contact related
  CONTACT_INQUIRY_ADMIN: 'ContactInquiryAdmin',
  CONTACT_INQUIRY_CONFIRMATION: 'ContactInquiryConfirmation',
  
  // Policy related
  CANCELLATION_POLICY_CHARGE_CLIENT: 'CancellationPolicyChargeClient',
  CANCELLATION_POLICY_CHARGE_PROFESSIONAL: 'CancellationPolicyChargeProfessional',
  
  // Incident related
  NO_SHOW_NOTIFICATION_CLIENT: 'NoShowNotificationClient',
  NO_SHOW_NOTIFICATION_PROFESSIONAL: 'NoShowNotificationProfessional',
  
  // Support Request related
  SUPPORT_REQUEST_CREATION: 'SupportRequestCreation',
  SUPPORT_REQUEST_REFUNDED_CLIENT: 'SupportRequestRefundedClient',
  SUPPORT_REQUEST_REFUNDED_PROFESSIONAL: 'SupportRequestRefundedProfessional',
  SUPPORT_REQUEST_RESOLVED_CLIENT: 'SupportRequestResolvedClient',
  SUPPORT_REQUEST_RESOLVED_PROFESSIONAL: 'SupportRequestResolvedProfessional',
} as const; 