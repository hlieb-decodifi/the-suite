'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfessionalPaymentMethodsAction } from '@/server/domains/payment_methods/actions';
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

    if (currentUser.user_metadata?.role === 'client') {
      redirect('/client-profile', RedirectType.replace);
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
  const profileData = await getProfileData(targetUserId);

  return (
    <ProfilePageClient
      user={user as User}
      profileData={profileData.profile}
      workingHours={profileData.workingHours}
      paymentMethods={profileData.paymentMethods}
      portfolioPhotos={profileData.portfolioPhotos}
      isEditable={isEditable}
    />
  );
}

// Server actions for this page
export async function getProfileData(userId: string) {
  try {
    // Fetch profile data
    const profileResult = await getProfileAction(userId);
    const profile =
      profileResult.success && profileResult.data ? profileResult.data : null;

    // Fetch working hours
    const workingHoursResult = await getWorkingHoursAction(userId);
    const workingHours = workingHoursResult.success
      ? workingHoursResult.hours || []
      : [];

    // Fetch payment methods
    const paymentMethodsResult =
      await getProfessionalPaymentMethodsAction(userId);
    const paymentMethods = paymentMethodsResult.success
      ? paymentMethodsResult.methods || []
      : [];

    // Fetch portfolio photos
    const portfolioPhotosResult = await getPortfolioPhotos(userId);
    const portfolioPhotos = portfolioPhotosResult.success
      ? portfolioPhotosResult.photos || []
      : [];

    return {
      profile,
      workingHours,
      paymentMethods,
      portfolioPhotos,
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return {
      profile: null,
      workingHours: [] as WorkingHoursEntry[],
      paymentMethods: [] as PaymentMethod[],
      portfolioPhotos: [] as PortfolioPhotoUI[],
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
