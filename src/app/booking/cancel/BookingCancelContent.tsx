'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { XCircle, Loader2 } from 'lucide-react';
import { cancelBookingForFailedCheckout } from '@/server/domains/stripe-payments/actions';

export function BookingCancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancellationStatus, setCancellationStatus] = useState<
    'pending' | 'success' | 'error'
  >('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!searchParams) return;
    const bookingIdParam = searchParams.get('booking_id');
    if (bookingIdParam) {
      setBookingId(bookingIdParam);
      handleBookingCancellation(bookingIdParam);
    }
  }, [searchParams]);

  const handleBookingCancellation = async (bookingId: string) => {
    setIsProcessing(true);
    try {
      const result = await cancelBookingForFailedCheckout(bookingId);

      if (result.success) {
        setCancellationStatus('success');
      } else {
        setCancellationStatus('error');
        // Use user-friendly error messages
        if (result.error === 'Booking not found') {
          setErrorMessage('Your booking was already cancelled or expired');
        } else {
          setErrorMessage('Unable to process cancellation');
        }
      }
    } catch (error) {
      setCancellationStatus('error');
      setErrorMessage('Payment was cancelled successfully');
      console.error('Error cancelling booking:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    // Go to services page to book again
    router.push('/services');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <CardTitle>Processing Cancellation</CardTitle>
            <CardDescription>
              We're cancelling your booking and freeing up the time slot...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
          <CardTitle>Payment Cancelled</CardTitle>
          <CardDescription>
            {cancellationStatus === 'success'
              ? 'Your payment was cancelled and the booking has been removed. The time slot is now available again.'
              : cancellationStatus === 'error'
                ? 'Your payment was cancelled. The appointment was not created.'
                : 'Your payment was cancelled and your booking was not completed.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {bookingId && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Booking Reference</p>
              <p className="font-mono text-sm">{bookingId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cancellationStatus === 'success'
                  ? 'This booking has been successfully cancelled.'
                  : cancellationStatus === 'error'
                    ? errorMessage
                    : 'This booking is being cancelled...'}
              </p>
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can try booking again or return to the homepage.
            </p>
            <div className="flex flex-col gap-4">
              <Button onClick={handleRetryPayment} className="w-full">
                Browse Services
              </Button>
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
