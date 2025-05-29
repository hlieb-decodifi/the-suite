import { Suspense } from 'react';
import { BookingCancelContent } from './BookingCancelContent';

export default function BookingCancelPage() {
  return (
    <div className="w-full bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        <BookingCancelContent />
      </Suspense>
    </div>
  );
}
