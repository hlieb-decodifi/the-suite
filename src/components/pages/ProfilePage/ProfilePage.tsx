'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getProfessionalPaymentMethodsAction,
  getProfessionalPaymentMethodsReadOnlyAction,
} from '@/server/domains/payment_methods/actions';
import { getProfileAction } from '@/server/domains/profiles/actions';
import {
  toggleProfilePublishStatusInDb,
  updateProfileHeaderInDb,
} from '@/server/domains/profiles/db';
import { getWorkingHoursAction } from '@/server/domains/working_hours/actions';
import { getPortfolioPhotos } from '@/server/domains/portfolio-photos/actions';
import { onSubscriptionChangeAction } from '@/server/domains/stripe-services';
import type { PaymentMethod } from '@/types/payment_methods';
import type { HeaderFormValues } from '@/types/profiles';
import { headerFormSchema, publishToggleSchema } from '@/types/profiles';
import type { WorkingHoursEntry } from '@/types/working_hours';
import type { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { revalidatePath } from 'next/cache';
import { redirect, RedirectType } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ProfilePageClient } from './ProfilePageClient';
import type { User } from '@supabase/supabase-js';

export type ProfilePageProps = {
  userId?: string;
  isEditable?: boolean;
};

export async function ProfilePage({
  userId,
  isEditable = true,
}: ProfilePageProps = {}) {
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

    // Check user role from database instead of metadata
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: currentUser.id,
    });
    const { data: isClient } = await supabase.rpc('is_client', {
      user_uuid: currentUser.id,
    });

    if (isClient) {
      redirect('/client-profile', RedirectType.replace);
    }

    if (!isProfessional) {
      redirect('/', RedirectType.replace);
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

  // Fetch all data on the server
  try {
    const profileData = await getProfileData(targetUserId, isEditable);

    return (
      <ProfilePageClient
        user={user as User}
        profileData={profileData.profile}
        workingHours={profileData.workingHours}
        timezone={profileData.timezone}
        paymentMethods={profileData.paymentMethods}
        portfolioPhotos={profileData.portfolioPhotos}
        isEditable={isEditable}
        unreadMessagesCount={profileData.unreadMessagesCount}
      />
    );
  } catch (error) {
    // Handle specific RLS error for unpublished profiles
    if (error instanceof Error && error.message === 'PROFILE_NOT_ACCESSIBLE') {
      notFound();
    }

    // For other errors, re-throw or handle as needed
    throw error;
  }
}

// Helper function to check if an error is an RLS policy violation
function isRLSError(error: string | undefined): boolean {
  if (!error) return false;
  return (
    error.includes('row-level security policy') ||
    error.includes('42501') ||
    error.includes('RLS') ||
    error.includes('new row violates row-level security policy')
  );
}

// Server actions for this page
export async function getProfileData(
  userId: string,
  isEditable: boolean = true,
) {
  try {
    // Fetch profile data
    const profileResult = await getProfileAction(userId);
    const profile =
      profileResult.success && profileResult.data ? profileResult.data : null;

    // If profile fetch failed, check if it's due to RLS policy (unpublished profile)
    if (!profileResult.success && profileResult.error) {
      // Check if the error is related to RLS policy violation
      if (isRLSError(profileResult.error)) {
        // This is an RLS error - the profile exists but is not published/accessible
        throw new Error('PROFILE_NOT_ACCESSIBLE');
      }
      // For other errors, throw the original error
      throw new Error(profileResult.error);
    }

    // Fetch working hours with timezone (silently handle RLS errors)
    const workingHoursResult = await getWorkingHoursAction(userId);
    const workingHours = workingHoursResult.success
      ? workingHoursResult.hours || []
      : [];
    const timezone = workingHoursResult.success
      ? workingHoursResult.timezone || ''
      : '';

    // Fetch payment methods (use read-only action for public viewing to avoid RLS errors)
    let paymentMethods: PaymentMethod[] = [];
    try {
      const paymentMethodsResult = isEditable
        ? await getProfessionalPaymentMethodsAction(userId)
        : await getProfessionalPaymentMethodsReadOnlyAction(userId);
      paymentMethods = paymentMethodsResult.success
        ? paymentMethodsResult.methods || []
        : [];
    } catch (paymentError) {
      // Silently handle RLS errors for payment methods
      if (paymentError instanceof Error && !isRLSError(paymentError.message)) {
        console.error('Non-RLS error fetching payment methods:', paymentError);
      }
    }

    // Fetch portfolio photos (silently handle RLS errors)
    let portfolioPhotos: PortfolioPhotoUI[] = [];
    try {
      const portfolioPhotosResult = await getPortfolioPhotos(userId);
      portfolioPhotos = portfolioPhotosResult.success
        ? portfolioPhotosResult.photos || []
        : [];
    } catch (portfolioError) {
      // Silently handle RLS errors for portfolio photos
      if (
        portfolioError instanceof Error &&
        !isRLSError(portfolioError.message)
      ) {
        console.error(
          'Non-RLS error fetching portfolio photos:',
          portfolioError,
        );
      }
    }

    // Fetch unread messages count for editable profiles
    let unreadMessagesCount = 0;
    if (isEditable) {
      try {
        const { getUnreadMessagesCount } = await import(
          '@/components/layouts/DashboardPageLayout/DashboardPageLayout'
        );
        unreadMessagesCount = await getUnreadMessagesCount(userId);
      } catch (messageError) {
        console.error('Error fetching unread messages count:', messageError);
      }
    }

    return {
      profile,
      workingHours,
      timezone,
      paymentMethods,
      portfolioPhotos,
      unreadMessagesCount,
    };
  } catch (error) {
    // Re-throw specific errors for handling in the calling component
    if (error instanceof Error && error.message === 'PROFILE_NOT_ACCESSIBLE') {
      throw error;
    }

    // Log non-RLS errors
    if (error instanceof Error && !isRLSError(error.message)) {
      console.error('Error fetching profile data:', error);
    }

    return {
      profile: null,
      workingHours: [] as WorkingHoursEntry[],
      timezone: '',
      paymentMethods: [] as PaymentMethod[],
      portfolioPhotos: [] as PortfolioPhotoUI[],
      unreadMessagesCount: 0,
    };
  }
}

export async function updateProfileHeaderAction(
  userId: string,
  data: HeaderFormValues,
) {
  try {
    // Validate input with Zod
    const validatedData = headerFormSchema.parse(data);

    await updateProfileHeaderInDb(userId, validatedData);
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating profile header:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

export async function toggleProfilePublishStatusAction(
  userId: string,
  isPublished: boolean,
) {
  try {
    // Validate input with Zod
    const validatedData = publishToggleSchema.parse({ isPublished });

    await toggleProfilePublishStatusInDb(userId, validatedData.isPublished);

    // Revalidate both the page and layout to ensure all components get fresh data
    revalidatePath('/profile', 'layout');
    revalidatePath('/profile');

    // Sync services with Stripe after publish status change
    try {
      const syncResult = await onSubscriptionChangeAction(userId);
      if (!syncResult.success) {
        console.error(
          'Stripe service sync failed after publish status change:',
          syncResult.message,
        );
        // Don't fail the publish action, just log the sync error
      }
    } catch (syncError) {
      console.error(
        'Error syncing services with Stripe after publish status change:',
        syncError,
      );
      // Don't fail the publish action due to sync issues
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to toggle publish status',
    };
  }
}
