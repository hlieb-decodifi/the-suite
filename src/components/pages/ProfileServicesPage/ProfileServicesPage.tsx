'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileServicesPageClient } from './ProfileServicesPageClient';
import { getServices } from '@/server/domains/services/actions';
import type { ServiceUI } from '@/types/services';
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

    // Check if user is professional
    const userRole = currentUser.user_metadata?.role;
    if (userRole !== 'professional') {
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

  return (
    <ProfileServicesPageClient
      user={user as User}
      initialServices={servicesResult.services}
      initialPagination={servicesResult.pagination}
      initialSearch={search}
      isEditable={isEditable}
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
  return upsertService({ userId, data });
}

export async function deleteServiceAction({
  userId,
  serviceId,
}: {
  userId: string;
  serviceId: string;
}) {
  const { deleteService } = await import('@/server/domains/services/actions');
  return deleteService({ userId, serviceId });
}
