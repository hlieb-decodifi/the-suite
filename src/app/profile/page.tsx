'use client';

import { useAuthStore } from '@/stores/authStore';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { ProfileTemplate } from '@/components/templates/ProfileTemplate/ProfileTemplate';

export default function ProfilePage() {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    // Redirect to home if not authenticated and not loading
    if (!isLoading && !isAuthenticated) {
      redirect('/');
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while auth state is being determined
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If authenticated, render the profile page
  return <ProfileTemplate user={user} />;
}
