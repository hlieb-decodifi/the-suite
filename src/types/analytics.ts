/**
 * Analytics event properties and types
 */

// Base event properties that all events should include
export type BaseEventProperties = {
  timestamp?: string;
  session_id?: string;
  user_agent?: string;
  referrer?: string;
}

// Authentication events
export type AuthEventProperties = {
  method?: string;
  user_id?: string;
} & BaseEventProperties

// Business events
export type ServiceEventProperties = {
  service_id: string;
  service_name?: string;
  professional_id?: string;
  service_category?: string;
  price?: number;
} & BaseEventProperties

export type BookingEventProperties = {
  booking_id: string;
  service_id: string;
  professional_id?: string;
  value?: number;
  currency?: string;
  booking_date?: string;
} & BaseEventProperties

export type PaymentEventProperties = {
  transaction_id?: string;
  booking_id?: string;
  service_id?: string;
  payment_method: string;
  value: number;
  currency?: string;
  payment_status?: string;
} & BaseEventProperties

// Search and discovery events
export type SearchEventProperties = {
  search_term: string;
  result_count?: number;
  filters_applied?: string[];
  search_category?: string;
} & BaseEventProperties

export type FilterEventProperties = {
  filter_type: string;
  filter_value: string | number | boolean;
  total_results?: number;
} & BaseEventProperties

// Professional events
export type ProfessionalEventProperties = {
  professional_id?: string;
  update_type?: string;
  service_count?: number;
} & BaseEventProperties

// Error tracking
export type ErrorEventProperties = {
  error_message: string;
  error_code?: string;
  error_stack?: string;
  component?: string;
  action?: string;
} & BaseEventProperties

// Page tracking
export type PageEventProperties = {
  url: string;
  title?: string;
  previous_page?: string;
  time_on_page?: number;
} & BaseEventProperties

// User identification
export type UserProperties = {
  email?: string;
  role?: string;
  created_at?: string;
  last_login?: string;
  subscription_status?: string;
  professional_id?: string;
  client_id?: string;
}

// Generic event properties for custom events
export type CustomEventProperties = BaseEventProperties & Record<string, string | number | boolean | null | undefined>;

// Union type for all event properties
export type AnalyticsEventProperties = 
  | AuthEventProperties
  | ServiceEventProperties 
  | BookingEventProperties
  | PaymentEventProperties
  | SearchEventProperties
  | FilterEventProperties
  | ProfessionalEventProperties
  | ErrorEventProperties
  | PageEventProperties
  | CustomEventProperties;
