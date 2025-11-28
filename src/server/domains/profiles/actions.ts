'use server';

import { revalidatePath } from 'next/cache';
import {
  getProfileFromDb,
  toggleProfilePublishStatusInDb,
  updateProfileHeaderInDb,
  updateSubscriptionStatusInDb,
  setCookieConsentInDb,
} from './db';
import { headerFormSchema, publishToggleSchema } from '@/types/profiles';

export async function getProfileAction(userId: string) {
  try {
    const profile = await getProfileFromDb(userId);
    return { success: true, data: profile };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    };
  }
}

export async function updateProfileHeaderAction(
  userId: string,
  rawData: unknown,
) {
  try {
    // Validate input with Zod
    const data = headerFormSchema.parse(rawData);

    await updateProfileHeaderInDb(userId, data);
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
  rawData: unknown,
) {
  try {
    // Validate input with Zod
    const { isPublished } = publishToggleSchema.parse(rawData);

    await toggleProfilePublishStatusInDb(userId, isPublished);

    // Revalidate both the page and layout to ensure all components get fresh data
    revalidatePath('/profile', 'layout');
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

export async function updateSubscriptionStatusAction(userId: string) {
  try {
    await updateSubscriptionStatusInDb(userId);
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update subscription',
    };
  }
}

export async function setCookieConsentAction(userId: string, consent: boolean) {
  try {
    await setCookieConsentInDb(userId, consent);
    return { success: true };
  } catch (error) {
    console.error('Error updating cookie consent:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update cookie consent',
    };
  }
}
