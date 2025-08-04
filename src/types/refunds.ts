/**
 * Legacy refund types - refunds are now handled as support requests
 */

// Legacy types for backward compatibility
export type Refund = {
  id: string;
  appointment_id: string;
  client_id: string;
  professional_id: string;
  reason: string;
  original_amount: number;
  refund_amount?: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RefundInsert = Omit<Refund, 'id' | 'created_at' | 'updated_at'>;
export type RefundUpdate = Partial<RefundInsert>;

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