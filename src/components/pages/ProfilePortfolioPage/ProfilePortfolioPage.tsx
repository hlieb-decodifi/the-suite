'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfilePortfolioPageClient } from './ProfilePortfolioPageClient';
import { getPortfolioPhotos } from '@/server/domains/portfolio-photos/actions';
import type { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';

export type ProfilePortfolioPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
  userId?: string;
  isEditable?: boolean;
};

export async function ProfilePortfolioPage({
  userId,
  isEditable = true,
}: ProfilePortfolioPageProps = {}) {
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

  // Fetch portfolio photos data on the server
  const portfolioResult = await getPortfolioPhotosData(targetUserId);

  return (
    <ProfilePortfolioPageClient
      user={user as User}
      initialPhotos={portfolioResult.photos}
      isEditable={isEditable}
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
