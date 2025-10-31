export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type BookingCancellationWithinAcceptedTimePeriodProfessionalParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  professional_name: string;
  timezone: string;
  services: {
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

export type BookingCancellationWithinAcceptedTimePeriodClientParams = {
  booking_id: string;
  cancellation_reason: string;
  client_name: string;
  date_time: string;
  professional_name: string;
  services_page_url: string;
  timezone: string;
  services: {
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

// Payment Related
// Legacy template - to be replaced
export type BalanceNotificationParams = {
  professional_name: string;
  total_amount: number;
  deposit_paid?: number;
  balance_amount: number;
  current_tip?: number;
  total_due: number;
  balance_payment_url: string;
  appointment_id: string;
  appointment_details_url: string;
  date: string;
  time: string;
  website_url: string;
  support_email: string;
};

// Contact Related
export type ContactInquiryAdminParams = {
  email: string;
  full_name: string;
  message: string;
  phone: string;
  topic: string;
};

export type ContactInquiryConfirmationParams = {
  email: string;
  first_name: string;
  full_name: string;
  message: string;
  phone: string;
  topic: string;
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

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
    duration: string; // Formatted duration like "1h 30m"
    name: string;
    price: number;
  }[];
};

// Support Request Related
export type SupportRequestCreationParams = {
  professional_name: string;
  support_request_url: string;
};

export type SupportRequestRefundedClientParams = {
  address: string;
  booking_id: string;
  client_name: string;
  date_and_time: string;
  professional_name: string;
  refund_amount: number;
  refund_method: string;
};

export type SupportRequestRefundedProfessionalParams = {
  address: string;
  booking_id: string;
  client_name: string;
  date_and_time: string;
  professional_name: string;
  refund_amount: number;
};

export type SupportRequestResolvedClientParams = {
  booking_id: string;
  client_name: string;
  professional_name: string;
};

export type SupportRequestResolvedProfessionalParams = {
  booking_id: string;
  client_name: string;
  professional_name: string;
};
