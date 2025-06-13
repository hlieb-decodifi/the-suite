import { BookingConfirmationTemplate } from '@/components/templates/BookingConfirmationTemplate';
import { notFound } from 'next/navigation';

type BookingConfirmationPageProps = {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ bookingId?: string; sessionId?: string }>;
};

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: BookingConfirmationPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { serviceId } = resolvedParams;
  const { bookingId, sessionId } = resolvedSearchParams;

  // Validate required parameters
  if (!serviceId || (!bookingId && !sessionId)) {
    notFound();
  }

  return (
    <BookingConfirmationTemplate
      serviceId={serviceId}
      bookingId={bookingId}
      sessionId={sessionId}
    />
  );
}
