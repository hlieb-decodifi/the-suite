'use client';

import { AuthConfirmedTemplate } from '@/components/templates/AuthConfirmedTemplate';
import { Suspense } from 'react';

export default function ConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <AuthConfirmedTemplate />
    </Suspense>
  );
}
