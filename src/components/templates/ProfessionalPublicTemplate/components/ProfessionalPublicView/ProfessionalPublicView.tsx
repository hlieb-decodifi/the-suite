'use client';

import { ProfessionalProfileView } from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/ProfessionalProfileView';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';

export type ProfessionalPublicViewProps = {
  profileId: string;
};

export function ProfessionalPublicView({
  profileId,
}: ProfessionalPublicViewProps) {
  const [user] = useState<User>({
    id: profileId,
    email: '',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  });

  return (
    <>
      <ProfessionalProfileView user={user} isPublicView={true} />
    </>
  );
}
