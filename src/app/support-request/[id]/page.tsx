import { SupportRequestDetailPage } from '@/components/pages/SupportRequestDetailPage/SupportRequestDetailPage';
import { notFound } from 'next/navigation';

type SupportRequestDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SupportRequestDetailRoute({
  params,
}: SupportRequestDetailRouteProps) {
  const { id } = await params;

  // Validate UUID format to prevent processing invalid IDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  return <SupportRequestDetailPage id={id} />;
}
