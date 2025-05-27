'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileServicesPageClient } from './ProfileServicesPageClient';
import { getServices } from '@/server/domains/services/actions';
import type { ServiceUI } from '@/types/services';

export type ProfileServicesPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function ProfileServicesPage({
  searchParams = {},
}: ProfileServicesPageProps) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if user is professional
  const userRole = user.user_metadata?.role;
  if (userRole !== 'professional') {
    redirect('/dashboard');
  }

  // Extract search parameters
  const page =
    typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
  const search =
    typeof searchParams.search === 'string' ? searchParams.search : '';
  const pageSize = 20; // Default page size

  // Fetch services data on the server
  const servicesResult = await getServicesData(user.id, page, pageSize, search);

  return (
    <ProfileServicesPageClient
      user={user}
      initialServices={servicesResult.services}
      initialPagination={servicesResult.pagination}
      initialSearch={search}
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
