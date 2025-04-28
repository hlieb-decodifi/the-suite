'use client';

import { User } from '@supabase/supabase-js';
import { ProfileSummaryCard } from './components/ProfileSummaryCard';
import { AccountDetailsCard } from './components/AccountDetailsCard';

export type ProfileTemplateProps = {
  user: User | null;
};

export function ProfileTemplate({ user }: ProfileTemplateProps) {
  if (!user) {
    return null;
  }

  // Extract user data
  const firstName = user.user_metadata?.first_name || '';
  const lastName = user.user_metadata?.last_name || '';
  const fullName =
    `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="container mx-auto py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProfileSummaryCard
          fullName={fullName}
          email={email}
          avatarUrl={avatarUrl}
        />
        <AccountDetailsCard
          firstName={firstName}
          lastName={lastName}
          email={email}
          userId={user.id}
        />
      </div>
    </div>
  );
}
