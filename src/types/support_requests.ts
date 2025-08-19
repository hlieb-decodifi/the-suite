export type SupportRequest = {
  id: string;
  client_id: string;
  professional_id?: string;
  conversation_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  booking_id?: string;
  appointment_id?: string;
  requested_amount?: number;
  original_amount?: number;
  transaction_fee?: number;
  refund_amount?: number;
  stripe_refund_id?: string;
  professional_notes?: string;
  declined_reason?: string;
  processed_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  unreadCount?: number;
  conversationId?: string;
  client_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_photos?: { url: string }[];
  };
  professional_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_photos?: { url: string }[];
  };
  appointments?: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    bookings?: {
      id: string;
      booking_services?: {
        services?: {
          id: string;
          name: string;
        }[];
      }[];
    };
  };
};
