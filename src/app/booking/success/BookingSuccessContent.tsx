'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { verifyBookingPayment } from '@/server/domains/stripe-payments/actions';
import { useActivityTracker } from '@/api/activity-log';

type PaymentStatus = 'processing' | 'success' | 'error';

export function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { trackBookingCompleted } = useActivityTracker();

  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUncaptured, setIsUncaptured] = useState(false);
  const hasShownToast = useRef(false);
  const hasTrackedCompletion = useRef(false);

  useEffect(() => {
    if (!searchParams) return;
    const sessionId = searchParams.get('session_id');
    const bookingIdParam = searchParams.get('booking_id');

    if (!sessionId || !bookingIdParam) {
      setStatus('error');
      setErrorMessage('Missing payment session information');
      return;
    }

    setBookingId(bookingIdParam);

    // Verify payment status using server action
    const verifyPayment = async () => {
      try {
        const result = await verifyBookingPayment(sessionId, bookingIdParam);

        if (!result.success) {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to verify payment status');
          return;
        }

        if (result.paymentStatus === 'completed') {
          console.log('result', result);
          setStatus('success');
          setIsUncaptured(result.isUncaptured || false);
          setAppointmentId(result.appointmentId || null);

          // Track booking completion (only once)
          if (!hasTrackedCompletion.current && bookingIdParam) {
            hasTrackedCompletion.current = true;
            trackBookingCompleted(bookingIdParam, {
              payment_status: 'completed',
              is_uncaptured: result.isUncaptured || false,
              appointment_id: result.appointmentId,
              source: 'success_page_verification',
            });
          }

          if (!hasShownToast.current) {
            hasShownToast.current = true;
            toast({
              title: result.isUncaptured
                ? 'Booking Confirmed!'
                : 'Payment Successful!',
              description: result.isUncaptured
                ? 'Your booking is confirmed. Payment will be processed closer to your appointment.'
                : 'Your booking has been confirmed and payment processed.',
            });
          }
        } else if (result.paymentStatus === 'failed') {
          setStatus('error');
          setErrorMessage('Payment failed. Please try again.');
        } else {
          // Still pending, could retry or show different message
          setStatus('error');
          setErrorMessage(
            'Payment is still being processed. Please check back later.',
          );
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setErrorMessage('Failed to verify payment status');
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleContinue = () => {
    // Redirect to dashboard or bookings page
    router.push('/dashboard');
  };

  const handleViewBooking = () => {
    if (appointmentId) {
      router.push(`/bookings/${appointmentId}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleRetry = () => {
    // Go back to the booking page or retry payment
    router.push('/');
  };

  if (status === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <CardTitle>Processing Payment</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>
              {errorMessage || 'There was an issue processing your payment.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <CardTitle>Booking Confirmed!</CardTitle>
          <CardDescription>
            {isUncaptured
              ? 'Your payment method has been authorized and your booking is confirmed.'
              : 'Your payment has been processed successfully.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {bookingId && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-mono text-sm">{bookingId}</p>
            </div>
          )}
          {isUncaptured && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                Payment Schedule
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your payment method is authorized. The final payment will be
                automatically processed closer to your appointment date.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email shortly with your booking
              details.
            </p>
            <div className="flex gap-2">
              {appointmentId ? (
                <Button onClick={handleViewBooking} className="flex-1">
                  View Booking Details
                </Button>
              ) : (
                <Button onClick={handleContinue} className="flex-1">
                  View Dashboard
                </Button>
              )}
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
