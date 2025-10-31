/**
 * Types for activity analytics data
 */

export type EngagementAnalytics = {
  total_service_views: number;
  total_professional_views: number;
  total_bookings_started: number;
  total_bookings_completed: number;
  conversion_rate: number;
  engagement_rate: number;
  bounce_rate: number;
};

export type NonConvertingUser = {
  user_id: string | null;
  session_id: string;
  user_name: string | null; // Now comes directly from the database function
  service_views: number;
  professional_views: number;
  bookings_started: number;
  bookings_completed: number;
  last_activity: string;
  viewed_entities: ViewedEntity[];
};

export type ViewedEntity = {
  type: 'service' | 'professional' | 'booking';
  id: string;
  activity: string;
  timestamp: string;
};

export type ActivityLogEntry = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  activity_type:
    | 'page_view'
    | 'service_view'
    | 'professional_view'
    | 'booking_started'
    | 'booking_completed'
    | 'booking_cancelled'
    | 'search_performed';
  entity_type: 'service' | 'professional' | 'booking' | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
};
