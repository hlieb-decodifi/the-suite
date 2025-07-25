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

// Booking Confirmation
export type BookingConfirmationClientParams = {
  client_name: string;
  professional_name: string;
  subtotal: number;
  service_fee: number;
  tip_amount?: number;
  total: number;
  payment_method: string;
  is_card_payment: boolean;
  deposit_amount?: number;
  balance_due?: number;
  balance_due_date?: string;
} & BaseBookingParams

export type BookingConfirmationProfessionalParams = {
  client_name: string;
  client_phone?: string;
  professional_name: string;
  subtotal: number;
  tip_amount?: number;
  professional_total: number;
} & BaseBookingParams

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
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  inquiry_id: string;
  submitted_at: string;
  urgency: string;
  urgency_color: string;
  dashboard_url: string;
}

export type ContactInquiryConfirmationParams = {
  name: string;
  email: string;
  subject: string;
  message: string;
  inquiry_id: string;
}

// Policy Related
type PolicyInfo = {
  charge_amount: number;
  charge_percentage: number;
  service_amount: number;
  time_description: string;
}

export type CancellationPolicyChargeClientParams = {
  client_name: string;
  professional_name: string;
  policy_info: PolicyInfo;
} & BaseBookingParams

export type CancellationPolicyChargeProfessionalParams = {
  client_name: string;
  professional_name: string;
  policy_info: PolicyInfo;
} & BaseBookingParams

// Incident Related
export type NoShowNotificationClientParams = {
  client_name: string;
  professional_name: string;
  no_show_fee: number;
} & BaseBookingParams

export type NoShowNotificationProfessionalParams = {
  client_name: string;
  professional_name: string;
  no_show_fee: number;
} & BaseBookingParams