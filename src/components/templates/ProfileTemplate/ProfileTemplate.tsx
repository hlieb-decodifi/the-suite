import { User } from '@supabase/supabase-js';
import { ClientProfileView } from './components/ClientProfileView/ClientProfileView';
import { ProfessionalProfileView } from './components/ProfessionalProfileView/ProfessionalProfileView';
import { notFound } from 'next/navigation';

export type ProfileTemplateProps = {
  user: User | null;
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function ProfileTemplate({ user, searchParams }: ProfileTemplateProps) {
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
        return <ProfessionalProfileView user={user} searchParams={searchParams || {}} />;
      case 'client':
        return <ClientProfileView user={user} />;
      default:
        return notFound();
    }
  };

  return <div className="w-full">{renderProfileView()}</div>;
}
