import { BookingDetailPage } from '@/components/pages/BookingDetailPage/BookingDetailPage';
import { notFound } from 'next/navigation';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BookingDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingDetailRoute({
  params,
}: BookingDetailRouteProps) {
  const { id } = await params;
  
  // Validate UUID format to prevent processing invalid IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }
  
  return <BookingDetailPage id={id} />;
}
