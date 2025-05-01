import type { ProfileData, HeaderFormValues } from './types';

export async function getProfile(userId: string): Promise<ProfileData> {
  const response = await fetch(`/api/profiles/${userId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch profile');
  }
  return response.json();
}

export async function updateProfileHeader(userId: string, data: HeaderFormValues): Promise<void> {
  const response = await fetch(`/api/profiles/${userId}/header`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update profile');
  }
}

export async function toggleProfilePublishStatus(userId: string, isPublished: boolean): Promise<void> {
  const response = await fetch(`/api/profiles/${userId}/publish`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublished }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to toggle publish status');
  }
}

export async function updateSubscriptionStatus(userId: string): Promise<void> {
  const response = await fetch(`/api/profiles/${userId}/subscribe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update subscription');
  }
} 