'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfilePortfolioPageClient } from './ProfilePortfolioPageClient';
import { getPortfolioPhotos } from '@/server/domains/portfolio-photos/actions';
import type { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { revalidatePath } from 'next/cache';

export type ProfilePortfolioPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function ProfilePortfolioPage() {
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

  // Fetch portfolio photos data on the server
  const portfolioResult = await getPortfolioPhotosData(user.id);

  return (
    <ProfilePortfolioPageClient
      user={user}
      initialPhotos={portfolioResult.photos}
    />
  );
}

// Server actions for this page
export async function getPortfolioPhotosData(userId: string) {
  try {
    const result = await getPortfolioPhotos(userId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch portfolio photos');
    }

    return {
      photos: result.photos || [],
    };
  } catch (error) {
    console.error('Error fetching portfolio photos data:', error);
    return {
      photos: [] as PortfolioPhotoUI[],
    };
  }
}

export async function uploadPortfolioPhotoAction({
  userId,
  formData,
}: {
  userId: string;
  formData: FormData;
}) {
  const { uploadPortfolioPhoto } = await import(
    '@/server/domains/portfolio-photos/actions'
  );
  revalidatePath('/profile');
  return uploadPortfolioPhoto(userId, formData);
}

export async function deletePortfolioPhotoAction({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const { deletePortfolioPhoto } = await import(
    '@/server/domains/portfolio-photos/actions'
  );
  revalidatePath('/profile');
  return deletePortfolioPhoto(id, userId);
}

export async function updatePortfolioPhotoAction({
  id,
  userId,
  updates,
}: {
  id: string;
  userId: string;
  updates: { description?: string; orderIndex?: number };
}) {
  const { updatePortfolioPhoto } = await import(
    '@/server/domains/portfolio-photos/actions'
  );
  revalidatePath('/profile');
  return updatePortfolioPhoto(id, userId, updates);
}
