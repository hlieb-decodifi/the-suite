import { RefundReviewPage } from '@/components/pages/RefundReviewPage/RefundReviewPage';
import { notFound } from 'next/navigation';

type RefundPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RefundPage({ params }: RefundPageProps) {
  const resolvedParams = await params;

  // Validate UUID format to prevent processing invalid IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(resolvedParams.id)) {
    notFound();
  }

  return <RefundReviewPage refundId={resolvedParams.id} />;
}
