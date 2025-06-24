import { Database } from '../../supabase/types';

export type Refund = Database['public']['Tables']['refunds']['Row'];
export type RefundInsert = Database['public']['Tables']['refunds']['Insert'];
export type RefundUpdate = Database['public']['Tables']['refunds']['Update'];

export type RefundRequest = {
  appointment_id: string;
  reason: string;
}

export type RefundApproval = {
  refund_id: string;
  requested_amount: number;
  professional_notes?: string;
}

export type RefundDecision = {
  refund_id: string;
  status: 'approved' | 'declined';
  requested_amount?: number;
  professional_notes?: string | undefined;
  declined_reason?: string | undefined;
} 