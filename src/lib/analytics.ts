/**
 * Analytics utilities for tracking events across PostHog and Google Analytics
 */

import type { 
  AnalyticsEventProperties, 
  UserProperties,
  CustomEventProperties 
} from '@/types/analytics';

// Declare gtag function for TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'consent',
      targetId: string | Date,
      config?: Record<string, string | number | boolean | null | undefined>,
    ) => void;
  }
}

// PostHog tracking (imported dynamically to avoid SSR issues)
const trackPostHogEvent = async (eventName: string, properties?: AnalyticsEventProperties) => {
  if (typeof window !== 'undefined') {
    const { default: posthog } = await import('posthog-js');
    posthog.capture(eventName, properties);
  }
};

// Google Analytics tracking using gtag
const trackGAEvent = (eventName: string, parameters?: Record<string, string | number | boolean | null | undefined>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

/**
 * Universal event tracking that sends to both PostHog and Google Analytics
 */
export const analytics = {
  // User authentication events
  trackSignUp: (method = 'email', userId?: string) => {
    trackGAEvent('sign_up', { method });
    trackPostHogEvent('user_signed_up', { method, user_id: userId });
  },

  trackLogin: (method = 'email', userId?: string) => {
    trackGAEvent('login', { method });
    trackPostHogEvent('user_logged_in', { method, user_id: userId });
  },

  // Business events
  trackServiceView: (serviceId: string, serviceName?: string, professionalId?: string) => {
    trackGAEvent('view_item', {
      item_id: serviceId,
      item_name: serviceName,
      item_category: 'service',
    });
    trackPostHogEvent('service_viewed', {
      service_id: serviceId,
      service_name: serviceName,
      professional_id: professionalId,
    });
  },

  trackBookingStarted: (serviceId: string, professionalId?: string) => {
    trackPostHogEvent('booking_started', {
      service_id: serviceId,
      professional_id: professionalId,
    });
  },

  trackBookingCompleted: (serviceId: string, bookingId: string, value?: number, professionalId?: string) => {
    trackGAEvent('booking_created', {
      service_id: serviceId,
      value: value,
      currency: 'USD',
    });
    trackPostHogEvent('booking_completed', {
      service_id: serviceId,
      booking_id: bookingId,
      value: value,
      professional_id: professionalId,
    });
  },

  trackPaymentCompleted: (
    paymentMethod: string, 
    value: number, 
    transactionId?: string, 
    bookingId?: string,
    serviceId?: string
  ) => {
    trackGAEvent('purchase', {
      transaction_id: transactionId,
      value: value,
      currency: 'USD',
      payment_type: paymentMethod,
    });
    trackPostHogEvent('payment_completed', {
      payment_method: paymentMethod,
      value: value,
      transaction_id: transactionId,
      booking_id: bookingId,
      service_id: serviceId,
    });
  },

  // Search and discovery
  trackSearch: (searchTerm: string, resultCount?: number) => {
    trackGAEvent('search', {
      search_term: searchTerm,
    });
    trackPostHogEvent('search_performed', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  },

  trackFilterUsed: (filterType: string, filterValue: string | number) => {
    trackPostHogEvent('filter_used', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  },

  // Professional actions
  trackServiceCreated: (serviceId: string, professionalId?: string) => {
    trackPostHogEvent('service_created', {
      service_id: serviceId,
      professional_id: professionalId,
    });
  },

  trackProfileUpdated: (professionalId?: string, updateType?: string) => {
    trackPostHogEvent('profile_updated', {
      professional_id: professionalId,
      update_type: updateType,
    });
  },

  // Page tracking
  trackPageView: (url: string, title?: string) => {
    if (typeof window !== 'undefined' && window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
        page_location: url,
        page_title: title || document.title,
      });
    }
    trackPostHogEvent('page_viewed', {
      url: url,
      title: title,
    });
  },

  // Error tracking
  trackError: (error: string, context?: CustomEventProperties) => {
    trackPostHogEvent('error_occurred', {
      error_message: error,
      ...context,
    });
  },

  // Custom events
  trackCustomEvent: (eventName: string, properties?: CustomEventProperties) => {
    trackGAEvent(eventName, properties);
    trackPostHogEvent(eventName, properties);
  },
};

/**
 * Identify user for analytics platforms
 */
export const identifyUser = async (userId: string, userProperties?: UserProperties) => {
  if (typeof window !== 'undefined') {
    const { default: posthog } = await import('posthog-js');
    posthog.identify(userId, userProperties);
  }
};

/**
 * Reset analytics user (for logout)
 */
export const resetAnalyticsUser = async () => {
  if (typeof window !== 'undefined') {
    const { default: posthog } = await import('posthog-js');
    posthog.reset();
  }
};
