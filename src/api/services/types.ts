import { Database } from '@/../supabase/types';

// Type alias for easier access to Service Row type
export type Service = Database['public']['Tables']['services']['Row'];

// Type for the service as it's used in the UI (with formatted duration)
export type ServiceUI = {
  id: string;
  name: string;
  price: number;
  duration: string; // formatted as "2h 30m"
  description: string;
};

// Form values from ServiceForm
export type ServiceFormData = {
  id?: string;
  name: string;
  description?: string;
  price: number;
  durationHours?: number;
  durationMinutes?: number;
} 