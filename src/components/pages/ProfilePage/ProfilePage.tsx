'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfessionalPaymentMethodsAction } from '@/server/domains/payment_methods/actions';
import { getProfileAction } from '@/server/domains/profiles/actions';
import {
  toggleProfilePublishStatusInDb,
  updateProfileHeaderInDb,
} from '@/server/domains/profiles/db';
import { getWorkingHoursAction } from '@/server/domains/working_hours/actions';
import type { PaymentMethod } from '@/types/payment_methods';
import type { HeaderFormValues } from '@/types/profiles';
import { headerFormSchema, publishToggleSchema } from '@/types/profiles';
import type { WorkingHoursEntry } from '@/types/working_hours';
import { revalidatePath } from 'next/cache';
import { redirect, RedirectType } from 'next/navigation';
import { ProfilePageClient } from './ProfilePageClient';

export async function ProfilePage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  if (user.user_metadata?.role === 'client') {
    redirect('/client-profile', RedirectType.replace);
  }

  // Fetch all data on the server
  const profileData = await getProfileData(user.id);

  return (
    <ProfilePageClient
      user={user}
      profileData={profileData.profile}
      workingHours={profileData.workingHours}
      paymentMethods={profileData.paymentMethods}
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

    return {
      profile,
      workingHours,
      paymentMethods,
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return {
      profile: null,
      workingHours: [] as WorkingHoursEntry[],
      paymentMethods: [] as PaymentMethod[],
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
    revalidatePath('/profile');
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
