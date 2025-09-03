export type EmailRecipient = {
  email: string;
  name?: string;
}

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Common types used across multiple templates
type PaymentMethod = {
  name: string;
  is_online: boolean;
}

type Payment = {
  method: PaymentMethod;
}

type RefundInfo = {
  original_amount: number;
  refund_amount?: number;
  status: string;
}

type Service = {
  name: string;
  price: number;
  duration?: number;
}

type BaseAppointmentParams = {
  appointment_id: string;
  appointment_details_url: string;
  date: string;
  time: string;
  website_url: string;
  support_email: string;
}

type BaseBookingParams = {
  booking_id: string;
  payment?: Payment;
  services?: Service[];
} & BaseAppointmentParams

// Booking Cancellation
export type BookingCancellationClientParams = {
  client_name: string;
  professional_name: string;
  cancellation_reason?: string;
  refund_info?: RefundInfo;
} & BaseBookingParams

export type BookingCancellationProfessionalParams = {
  client_name: string;
  client_phone?: string;
  professional_name: string;
  cancellation_reason?: string;
  refund_info?: RefundInfo;
} & BaseBookingParams

export type BookingCancellationWithinAcceptedTimePeriodProfessionalParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  professional_name: string;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type BookingCancellationWithinAcceptedTimePeriodClientParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  professional_name: string;
  services_page_url: string;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

// Booking Confirmation
export type BookingConfirmationClientParams = {
  appointment_url: string;
  booking_id: string;
  client_name: string;
  date_and_time: string;
  home_url: string;
  message_url: string;
  price_service_fee: number;
  price_subtotal: number;
  price_tip: number;
  price_total_paid: number;
  professional_address: string;
  professional_name: string;
  professional_phone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type BookingConfirmationProfessionalParams = {
  address: string;
  appointment_url: string;
  booking_id: string;
  client_name: string;
  client_phone: string;
  date_and_time: string;
  home_url: string;
  message_url: string;
  price_subtotal: number;
  price_tip: number;
  price_total_paid: number;
  professional_name: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type AppointmentCompletion2hafterClientParams = {
  booking_id: string;
  client_name: string;
  date_time: string;
  professional_name: string;
  review_tip_url: string;
  service_amount: number;
  timezone: string;
  total_paid: number;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type AppointmentCompletion2hafterProfessionalParams = {
  booking_id: string;
  client_name: string;
  date_time: string;
  payment_method: string;
  professional_name: string;
  service_amount: number;
  timezone: string;
  total_amount: number;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

// Payment Related
export type PaymentConfirmationClientParams = {
  client_name: string;
  professional_name: string;
  payment_method: string;
  subtotal: number;
  tip_amount?: number;
  total: number;
} & BaseBookingParams

export type PaymentConfirmationProfessionalParams = {
  client_name: string;
  professional_name: string;
  payment_method: string;
  subtotal: number;
  tip_amount?: number;
  professional_total: number;
} & BaseBookingParams

export type BalanceNotificationParams = {
  professional_name: string;
  total_amount: number;
  deposit_paid?: number;
  balance_amount: number;
  current_tip?: number;
  total_due: number;
  balance_payment_url: string;
} & BaseAppointmentParams

// Refund Related
export type RefundRequestProfessionalParams = {
  professional_name: string;
  client_name: string;
  service_name: string;
  original_amount: number;
  reason: string;
  review_url: string;
} & BaseAppointmentParams

export type RefundCompletionClientParams = {
  client_name: string;
  professional_name: string;
  original_amount: number;
  refund_amount: number;
  reason?: string;
} & BaseBookingParams

export type RefundCompletionProfessionalParams = {
  client_name: string;
  professional_name: string;
  original_amount: number;
  refund_amount: number;
  platform_fee: number;
  net_refund: number;
  reason?: string;
} & BaseBookingParams

export type RefundDeclineClientParams = {
  client_name: string;
  professional_name: string;
  original_amount: number;
  decline_reason: string;
} & BaseBookingParams

// Review Related
export type ReviewTipNotificationParams = {
  client_name: string;
  professional_name: string;
  payment_method: string;
  service_amount: number;
  service_fee: number;
  total_amount: number;
  review_url: string;
} & BaseAppointmentParams

// Contact Related
export type ContactInquiryAdminParams = {
  email: string;
  full_name: string;
  message: string;
  phone: string;
  topic: string;
}

export type ContactInquiryConfirmationParams = {
  email: string;
  first_name: string;
  full_name: string;
  message: string;
  phone: string;
  topic: string;
}

export type BookingCancellationLessthan24h48hclientParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  fee: number;
  policy_rate: string;
  professional_name: string;
  service_amount: number;
  time_until_appointment: string;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type BookingCancellationLessthan24h48hprofessionalParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  fee: number;
  policy_rate: string;
  professional_name: string;
  service_amount: number;
  time_until_appointment: string;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

// Incident Related
export type BookingCancellationNoShowClientParams = {
  booking_id: string;
  client_name: string;
  date_time: string;
  fee: number;
  message_url: string;
  policy_rate: string;
  professional_name: string;
  service_amount: number;
  services_page_url: string;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

export type BookingCancellationNoShowProfessionalParams = {
  booking_id: string;
  client_name: string;
  date_time: string;
  fee: number;
  policy_rate: string;
  professional_name: string;
  service_amount: number;
  timezone: string;
  services: {
    duration: number;
    name: string;
    price: number;
  }[];
}

// Support Request Related
export type SupportRequestCreationParams = {
  professional_name: string;
  support_request_url: string;
}

export type SupportRequestRefundedClientParams = {
  address: string;
  booking_id: string;
  client_name: string;
  date_and_time: string;
  professional_name: string;
  refund_amount: number;
  refund_method: string;
}

export type SupportRequestRefundedProfessionalParams = {
  address: string;
  booking_id: string;
  client_name: string;
  date_and_time: string;
  professional_name: string;
  refund_amount: number;
}

export type SupportRequestResolvedClientParams = {
  booking_id: string;
  client_name: string;
  professional_name: string;
}

export type SupportRequestResolvedProfessionalParams = {
  booking_id: string;
  client_name: string;
  professional_name: string;
}