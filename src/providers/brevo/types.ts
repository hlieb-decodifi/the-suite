export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type BookingCancellationParams = {
  professional_name: string;
  link: string;
  date: string;
  time: string;
  booking_id: string;
  payment_method: string;
  services: Array<{
    name: string;
    price: string;
  }>;
  cancellation_reason: string;
};

export type BookingConfirmationParams = {
  professional_name: string;
  client_name: string;
  date: string;
  time: string;
  booking_id: string;
  services: Array<{
    name: string;
    price: string;
    duration: string;
  }>;
  total_amount: string;
  deposit_amount: string;
  balance_due: string;
  appointment_link: string;
};

export type PaymentConfirmationParams = {
  professional_name: string;
  client_name: string;
  date: string;
  time: string;
  booking_id: string;
  amount: string;
  payment_method: string;
  receipt_link: string;
}; 