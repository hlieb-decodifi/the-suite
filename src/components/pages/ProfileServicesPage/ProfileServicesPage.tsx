'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileServicesPageClient } from './ProfileServicesPageClient';
import {
  getServices,
  getServiceLimitInfo,
} from '@/server/domains/services/actions';
import {
  syncServiceAction,
  archiveServiceAction,
} from '@/server/domains/stripe-services';
import type { ServiceUI, ServiceLimitInfo } from '@/types/services';
import type { User } from '@supabase/supabase-js';

export type ProfileServicesPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  userId?: string;
  isEditable?: boolean;
};

export async function ProfileServicesPage({
  searchParams,
  userId,
  isEditable = true,
}: ProfileServicesPageProps) {
  const supabase = await createClient();

  let targetUserId = userId;
  let user = null;

  if (!userId) {
    // Get the current user if no userId provided (original behavior)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect('/');
    }

    // Check if user is professional from database instead of metadata
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: currentUser.id,
    });

    if (!isProfessional) {
      redirect('/dashboard');
    }

    targetUserId = currentUser.id;
    user = currentUser;
  } else {
    // For public viewing, create a mock user object
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userData) {
      user = {
        id: userData.id,
        email: '', // Email not available for public viewing
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
      };
    }
  }

  if (!targetUserId || !user) {
    redirect('/');
  }

  // Fetch isBookable (professional is subscribed)
  let isBookable = false;
  const { data: profileData } = await supabase
    .from('professional_profiles')
    .select('is_subscribed')
    .eq('user_id', targetUserId)
    .single();
  if (profileData && profileData.is_subscribed === true) {
    isBookable = true;
  }

  // Extract search parameters
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page =
    typeof resolvedSearchParams.page === 'string'
      ? parseInt(resolvedSearchParams.page)
      : 1;
  const search =
    typeof resolvedSearchParams.search === 'string'
      ? resolvedSearchParams.search
      : '';
  const pageSize = 20; // Default page size

  // Fetch services data on the server
  const servicesResult = await getServicesData(
    targetUserId,
    page,
    pageSize,
    search,
  );

  // Fetch service limit info for editable pages
  let serviceLimitInfo: ServiceLimitInfo | null = null;
  if (isEditable) {
    const limitResult = await getServiceLimitInfo({ userId: targetUserId });
    if (limitResult.success && limitResult.data) {
      console.log('limitResult', limitResult);
      serviceLimitInfo = limitResult.data;
    }
  }

  return (
    <ProfileServicesPageClient
      user={user as User}
      initialServices={servicesResult.services}
      initialPagination={servicesResult.pagination}
      initialSearch={search}
      isEditable={isEditable}
      serviceLimitInfo={serviceLimitInfo}
      isBookable={isBookable}
    />
  );
}

// Server actions for this page
export async function getServicesData(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  search: string = '',
) {
  try {
    const result = await getServices({ userId, page, pageSize, search });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch services');
    }

    return {
      services: result.services || [],
      pagination: result.pagination || {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching services data:', error);
    return {
      services: [] as ServiceUI[],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function upsertServiceAction({
  userId,
  data,
}: {
  userId: string;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const { upsertService } = await import('@/server/domains/services/actions');
  const result = await upsertService({ userId, data });

  // If service was successfully created/updated, sync with Stripe
  if (result.success && result.service?.id) {
    try {
      const syncResult = await syncServiceAction(result.service.id);
      if (!syncResult.success) {
        console.error(
          'Stripe service sync failed after upsert:',
          syncResult.error,
        );
        // Don't fail the service operation, just log the sync error
      }
    } catch (syncError) {
      console.error(
        'Error syncing service with Stripe after upsert:',
        syncError,
      );
      // Don't fail the service operation due to sync issues
    }
  }

  return result;
}

export async function deleteServiceAction({
  userId,
  serviceId,
}: {
  userId: string;
  serviceId: string;
}) {
  // First archive the service from Stripe
  try {
    const archiveResult = await archiveServiceAction(serviceId);
    if (!archiveResult.success) {
      console.error(
        'Failed to archive service from Stripe:',
        archiveResult.error,
      );
      // Continue with deletion even if Stripe archive fails
    }
  } catch (archiveError) {
    console.error('Error archiving service from Stripe:', archiveError);
    // Continue with deletion even if Stripe archive fails
  }

  // Then delete from our database
  const { deleteService } = await import('@/server/domains/services/actions');
  return deleteService({ userId, serviceId });
}
