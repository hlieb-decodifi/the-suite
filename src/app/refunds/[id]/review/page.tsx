import { RefundReviewPage } from '@/components/pages/RefundReviewPage/RefundReviewPage';

type RefundReviewRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RefundReviewRoute({
  params,
}: RefundReviewRouteProps) {
  const { id } = await params;
  return <RefundReviewPage refundId={id} />;
}
