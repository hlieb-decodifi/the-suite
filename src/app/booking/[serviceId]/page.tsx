import { BookingPageTemplate } from '@/components/templates/BookingPageTemplate';
import { notFound } from 'next/navigation';

type BookingPageProps = {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ date?: string; professional?: string }>;
};

// Enable dynamic rendering and disable cache for real-time availability
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { serviceId } = resolvedParams;
  const { date, professional } = resolvedSearchParams;

  // Validate serviceId
  if (!serviceId || typeof serviceId !== 'string') {
    notFound();
  }

  return (
    <BookingPageTemplate
      serviceId={serviceId}
      preselectedDate={date}
      preselectedProfessional={professional}
    />
  );
}
