'use client';

import { useEffect } from 'react';
import { useActivityTracker } from '@/api/activity-log/hooks';

type ActivityTrackerProps = {
  // Track page views automatically
  trackPageView?: boolean;
  // Track specific activities
  activityType?: 'service_view' | 'professional_view';
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Component that automatically tracks activities when mounted
 * Use this component in pages/components where you want to track user engagement
 */
export function ActivityTracker({
  trackPageView = false,
  activityType,
  entityId,
  metadata,
}: ActivityTrackerProps) {
  const { 
    trackPageView: trackPage, 
    trackServiceView, 
    trackProfessionalView 
  } = useActivityTracker();

  useEffect(() => {
    // Track page view if requested
    if (trackPageView) {
      trackPage(metadata);
    }

    // Track specific activity type
    if (activityType && entityId) {
      switch (activityType) {
        case 'service_view':
          trackServiceView(entityId, metadata);
          break;
        case 'professional_view':
          trackProfessionalView(entityId, metadata);
          break;
      }
    }
  }, [
    trackPageView,
    activityType,
    entityId,
    metadata,
    trackPage,
    trackServiceView,
    trackProfessionalView,
  ]);

  // This component doesn't render anything
  return null;
}

/**
 * Higher-order component to wrap pages/components with activity tracking
 */
export function withActivityTracking<P extends object>(
  Component: React.ComponentType<P>,
  trackingConfig: Omit<ActivityTrackerProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <>
        <ActivityTracker {...trackingConfig} />
        <Component {...props} />
      </>
    );
  };
}
