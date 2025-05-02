import { Database } from '@/../supabase/types';

// Type for the master list of payment methods
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];

// Type representing a professional's accepted payment method (from junction table)
export type ProfessionalPaymentMethod = Database['public']['Tables']['professional_payment_methods']['Row'];

// Type for updating professional payment methods
export type UpdateProfessionalPaymentMethodsPayload = {
  userId: string;
  selectedMethodIds: string[];
}; 