import { Suspense } from 'react';
import { BookingSuccessContent } from './BookingSuccessContent';

export default function BookingSuccessPage() {
  return (
    <div className="w-full flex justify-center items-center bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Processing your payment...
              </p>
            </div>
          </div>
        }
      >
        <BookingSuccessContent />
      </Suspense>
    </div>
  );
}
