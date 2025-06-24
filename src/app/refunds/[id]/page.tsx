import { RefundReviewPage } from '@/components/pages/RefundReviewPage/RefundReviewPage';

type RefundPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RefundPage({ params }: RefundPageProps) {
  const resolvedParams = await params;

  return <RefundReviewPage refundId={resolvedParams.id} />;
}
