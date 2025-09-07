'use client';

import { useCallback } from 'react';
import { trackActivity } from './actions';
import { ActivityTypeEnum, EntityTypeEnum, type ActivityType, type EntityType } from './types';

/**
 * Hook for tracking user activities on the client side
 */
export function useActivityTracker() {
  // Generate a session ID for anonymous users (stored in sessionStorage)
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return undefined;
    
    let sessionId = window.sessionStorage.getItem('activity_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem('activity_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const track = useCallback(async (
    activityType: ActivityType,
    entityType?: EntityType,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const sessionId = getSessionId();
      
      await trackActivity({
        activityType,
        entityType,
        entityId,
        metadata,
        sessionId,
      });
    } catch (error) {
      // Silently fail activity tracking to not disrupt user experience
      console.error('Activity tracking failed:', error);
    }
  }, [getSessionId]);

  // Specific tracking methods for common activities
  const trackServiceView = useCallback((serviceId: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.SERVICE_VIEW, EntityTypeEnum.SERVICE, serviceId, metadata);
  }, [track]);

  const trackProfessionalView = useCallback((professionalId: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.PROFESSIONAL_VIEW, EntityTypeEnum.PROFESSIONAL, professionalId, metadata);
  }, [track]);

  const trackBookingStarted = useCallback((serviceId: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.BOOKING_STARTED, EntityTypeEnum.SERVICE, serviceId, metadata);
  }, [track]);

  const trackBookingCompleted = useCallback((bookingId: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.BOOKING_COMPLETED, EntityTypeEnum.BOOKING, bookingId, metadata);
  }, [track]);

  const trackBookingCancelled = useCallback((bookingId: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.BOOKING_CANCELLED, EntityTypeEnum.BOOKING, bookingId, metadata);
  }, [track]);

  const trackPageView = useCallback((metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.PAGE_VIEW, undefined, undefined, {
      path: window.location.pathname,
      search: window.location.search,
      ...metadata,
    });
  }, [track]);

  const trackSearch = useCallback((searchTerm: string, metadata?: Record<string, unknown>) => {
    return track(ActivityTypeEnum.SEARCH_PERFORMED, undefined, undefined, {
      search_term: searchTerm,
      ...metadata,
    });
  }, [track]);

  return {
    track,
    trackServiceView,
    trackProfessionalView,
    trackBookingStarted,
    trackBookingCompleted,
    trackBookingCancelled,
    trackPageView,
    trackSearch,
  };
}
