'use client';

import { UserWithProfile } from '@/api/auth';

type ProfileSectionProps = {
  user: UserWithProfile | null;
};

export const ProfileSection = ({ user }: ProfileSectionProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Profile Information</h3>
        <p className="text-gray-500">Email: {user?.email}</p>
        <p className="text-gray-500">
          Name: {user?.profile?.full_name || 'Not provided'}
        </p>
      </div>
    </div>
  );
};
