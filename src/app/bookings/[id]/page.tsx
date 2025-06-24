import { BookingDetailPage } from '@/components/pages/BookingDetailPage/BookingDetailPage';

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
  return <BookingDetailPage id={id} />;
}
