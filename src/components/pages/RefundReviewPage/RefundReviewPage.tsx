'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function RefundReviewPage({ refundId }: { refundId: string }) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Since refunds are now handled as support requests, 
  // redirect to the support request detail page
  // The refundId should correspond to a support request ID
  redirect(`/support-request/${refundId}`);
  
  // This return will never be reached due to redirect, but TypeScript needs it
  return null;
}
