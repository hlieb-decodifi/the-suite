'use client';

import { EmailConfirmationTemplate } from '@/components/templates/EmailConfirmationTemplate';
import { useSearchParams } from 'next/navigation';

export function EmailVerificationTemplate() {
  const searchParams = useSearchParams();
  const email = searchParams ? searchParams.get('email') : null;

  return <EmailConfirmationTemplate email={email} />;
}
