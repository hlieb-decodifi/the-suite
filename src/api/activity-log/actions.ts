'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import type { Json } from '@/../../supabase/types';

// Validation schema for activity tracking
const trackActivitySchema = z.object({
  activityType: z.enum([
    'page_view',
    'service_view',
    'professional_view',
    'booking_started',
    'booking_completed',
    'booking_cancelled',
    'search_performed',
  ]),
  entityType: z.enum(['service', 'professional', 'booking']).optional(),
  entityId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
});

type TrackActivityData = z.infer<typeof trackActivitySchema>;

/**
 * Server action to track user activities
 */
export async function trackActivity(data: TrackActivityData) {
  try {
    const supabase = await createClient();
    const headersList = await headers();

    // Get current user (might be null for anonymous users)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Extract request metadata
    const userAgent = headersList.get('user-agent') || null;
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || null;
    const referrer = headersList.get('referer') || null;

    // Validate the input data
    const validatedData = trackActivitySchema.parse(data);

    // Insert activity log entry
    const { error } = await supabase.from('activity_log').insert({
      user_id: user?.id || null,
      session_id: validatedData.sessionId || null,
      activity_type: validatedData.activityType,
      entity_type: validatedData.entityType || null,
      entity_id: validatedData.entityId || null,
      metadata: (validatedData.metadata as Json) || {},
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer: referrer,
    });

    if (error) {
      console.error('Error tracking activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in trackActivity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Server action to get engagement analytics (admin only)
 */
export async function getEngagementAnalytics(
  startDate?: string,
  endDate?: string,
  entityFilterType?: string,
  entityFilterId?: string,
) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });
    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    // Call the analytics function
    const rpcParams: Record<string, string> = {};
    if (startDate) rpcParams.start_date = startDate;
    if (endDate) rpcParams.end_date = endDate;
    if (entityFilterType) rpcParams.entity_filter_type = entityFilterType;
    if (entityFilterId) rpcParams.entity_filter_id = entityFilterId;

    const { data, error } = await supabase.rpc(
      'get_engagement_analytics',
      rpcParams,
    );

    if (error) {
      console.error('Error getting engagement analytics:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error in getEngagementAnalytics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Server action to get non-converting users (admin only)
 */
export async function getNonConvertingUsers(
  startDate?: string,
  endDate?: string,
  entityFilterType?: string,
  entityFilterId?: string,
) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });
    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    // Call the non-converting users function
    const rpcParams2: Record<string, string> = {};
    if (startDate) rpcParams2.start_date = startDate;
    if (endDate) rpcParams2.end_date = endDate;
    if (entityFilterType) rpcParams2.entity_filter_type = entityFilterType;
    if (entityFilterId) rpcParams2.entity_filter_id = entityFilterId;

    const { data, error } = await supabase.rpc(
      'get_non_converting_users',
      rpcParams2,
    );

    if (error) {
      console.error('Error getting non-converting users:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getNonConvertingUsers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
