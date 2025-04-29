'use client';

import { User } from '@supabase/supabase-js';

export type ProfessionalProfileViewProps = {
  user: User;
};

export function ProfessionalProfileView({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: ProfessionalProfileViewProps) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Professional Profile</h1>
    </div>
  );
}
