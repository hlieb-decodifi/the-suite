import { HeaderFormValues, ProfileData } from '@/types/profiles';
import {
  getProfileAction,
  updateProfileHeaderAction,
  toggleProfilePublishStatusAction,
  updateSubscriptionStatusAction,
  setCookieConsentAction,
} from '@/server/domains/profiles/actions';

export async function getProfile(userId: string) {
  const result = await getProfileAction(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch profile');
  }
  return result.data as ProfileData;
}

export async function updateProfileHeader(
  userId: string,
  data: HeaderFormValues,
) {
  const result = await updateProfileHeaderAction(userId, data);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update profile');
  }
  return result;
}

export async function toggleProfilePublishStatus(
  userId: string,
  isPublished: boolean,
) {
  const result = await toggleProfilePublishStatusAction(userId, {
    isPublished,
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to toggle publish status');
  }
  return result;
}

export async function updateSubscriptionStatus(userId: string) {
  const result = await updateSubscriptionStatusAction(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update subscription');
  }
  return result;
}

export async function setCookieConsent(userId: string, consent: boolean) {
  const result = await setCookieConsentAction(userId, consent);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update cookie consent');
  }
  return result;
}
