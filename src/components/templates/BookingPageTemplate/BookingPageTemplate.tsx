import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getServiceForBooking } from './actions';
import { BookingPageClient } from './components/BookingPageClient';
import { BookingPageSkeleton } from './components/BookingPageSkeleton';

export type BookingPageTemplateProps = {
  serviceId: string;
  preselectedDate?: string;
  preselectedProfessional?: string;
};

export async function BookingPageTemplate({
  serviceId,
  preselectedDate,
}: Omit<BookingPageTemplateProps, 'preselectedProfessional'>) {
  // Fetch service data on the server
  const service = await getServiceForBooking(serviceId);

  // If service not found or not bookable, show 404
  if (!service) {
    notFound();
  }

  return (
    <div className="w-full mx-auto min-h-screen bg-background">
      {/* Main Content */}
      <Suspense fallback={<BookingPageSkeleton />}>
        <BookingPageClient
          service={service}
          {...(preselectedDate && { preselectedDate })}
        />
      </Suspense>
    </div>
  );
}
