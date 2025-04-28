'use client';

import { User } from '@supabase/supabase-js';
import { ClientProfileView } from './components/ClientProfileView/ClientProfileView';
import { ProfessionalProfileView } from './components/ProfessionalProfileView/ProfessionalProfileView';
import { notFound } from 'next/navigation';

export type ProfileTemplateProps = {
  user: User | null;
};

export function ProfileTemplate({ user }: ProfileTemplateProps) {
  if (!user) {
    return null;
  }

  // Determine user role from metadata
  const userRole = user.user_metadata?.role;

  if (!userRole) {
    return notFound();
  }

  // Render the appropriate view based on user role
  const renderProfileView = () => {
    switch (userRole) {
      case 'professional':
        return <ProfessionalProfileView user={user} />;
      case 'client':
        return <ClientProfileView user={user} />;
      default:
        return notFound();
    }
  };

  return <div className="container mx-auto py-10">{renderProfileView()}</div>;
}
