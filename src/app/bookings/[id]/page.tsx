import { BookingDetailPage } from '@/components/pages/BookingDetailPage/BookingDetailPage';

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
