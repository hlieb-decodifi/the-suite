/**
 * Activity tracking types and enums
 * Separated from server actions to avoid "use server" restrictions
 */

// Activity types enum
export const ActivityTypeEnum = {
  PAGE_VIEW: 'page_view',
  SERVICE_VIEW: 'service_view',
  PROFESSIONAL_VIEW: 'professional_view',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  SEARCH_PERFORMED: 'search_performed',
} as const;

export type ActivityType =
  (typeof ActivityTypeEnum)[keyof typeof ActivityTypeEnum];

// Entity types enum
export const EntityTypeEnum = {
  SERVICE: 'service',
  PROFESSIONAL: 'professional',
  BOOKING: 'booking',
} as const;

export type EntityType = (typeof EntityTypeEnum)[keyof typeof EntityTypeEnum];
