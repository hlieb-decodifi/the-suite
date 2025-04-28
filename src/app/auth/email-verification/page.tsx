'use client';

import { EmailVerificationTemplate } from '@/components/templates/EmailVerificationTemplate';
import { Suspense } from 'react';

export default function EmailVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <EmailVerificationTemplate />
    </Suspense>
  );
}
