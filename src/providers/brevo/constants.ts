export const EMAIL_TEMPLATE_TAGS = {
  // Booking related
  BOOKING_CANCELLATION_LESS_THAN_24H_48H_CLIENT:
    'BookingCancellationLessthan24h48hclient',
  BOOKING_CANCELLATION_LESS_THAN_24H_48H_PROFESSIONAL:
    'BookingCancellationLessthan24h48hprofessional',
  BOOKING_CANCELLATION_WITHIN_ACCEPTED_TIME_PERIOD_PROFESSIONAL:
    'BookingCancellationWithinAcceptedTimePeriodProfessional',
  BOOKING_CANCELLATION_WITHIN_ACCEPTED_TIME_PERIOD_CLIENT:
    'BookingCancellationWithinAcceptedTimePeriodClient',

  BOOKING_CONFIRMATION_CLIENT: 'BookingConfirmationClient',
  BOOKING_CONFIRMATION_PROFESSIONAL: 'BookingConfirmationProfessional',

  APPOINTMENT_COMPLETION_2H_AFTER_CLIENT: 'AppointmentCompletion2hafterClient',
  APPOINTMENT_COMPLETION_2H_AFTER_PROFESSIONAL:
    'AppointmentCompletion2hafterProfessional',

  // Payment related
  BALANCE_NOTIFICATION: 'BalanceNotification',

  // Contact related
  CONTACT_INQUIRY_ADMIN: 'ContactInquiryAdmin',
  CONTACT_INQUIRY_CONFIRMATION: 'ContactInquiryConfirmation',

  // Incident related
  NO_SHOW_NOTIFICATION_CLIENT: 'BookingCancellationNoShowClient',
  NO_SHOW_NOTIFICATION_PROFESSIONAL: 'BookingCancellationNoShowProfessional',

  // Support Request related
  SUPPORT_REQUEST_CREATION: 'SupportRequestCreation',
  SUPPORT_REQUEST_REFUNDED_CLIENT: 'SupportRequestRefundedClient',
  SUPPORT_REQUEST_REFUNDED_PROFESSIONAL: 'SupportRequestRefundedProfessional',
  SUPPORT_REQUEST_RESOLVED_CLIENT: 'SupportRequestResolvedClient',
  SUPPORT_REQUEST_RESOLVED_PROFESSIONAL: 'SupportRequestResolvedProfessional',
} as const;
