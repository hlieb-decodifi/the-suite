'use server';

import { getRefundForReview } from '@/server/domains/refunds/actions';
import { notFound, redirect } from 'next/navigation';
import { RefundReviewPageClient } from './RefundReviewPageClient';
import { createClient } from '@/lib/supabase/server';

export async function RefundReviewPage({ refundId }: { refundId: string }) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user is professional
  const { data: isProfessional } = await supabase.rpc('is_professional', {
    user_uuid: user.id,
  });

  if (!isProfessional) {
    redirect('/');
  }

  try {
    const result = await getRefundForReview(refundId);

    if (!result.success || !result.refund) {
      console.error('Failed to get refund for review:', result.error);
      return notFound();
    }

    return (
      <RefundReviewPageClient refund={result.refund} currentUserId={user.id} />
    );
  } catch (error) {
    console.error('Error loading refund review page:', error);
    return notFound();
  }
}
