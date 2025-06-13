import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { CheckCircle, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export type BookingConfirmationTemplateProps = {
  serviceId: string;
  bookingId?: string;
  sessionId?: string;
};

export function BookingConfirmationTemplate({
  bookingId,
  sessionId,
}: Omit<BookingConfirmationTemplateProps, 'serviceId'>) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Booking Confirmed!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Typography className="text-muted-foreground">
              Your appointment has been successfully booked.
            </Typography>
            {bookingId && (
              <Typography
                variant="small"
                className="text-muted-foreground mt-2"
              >
                Booking ID: {bookingId}
              </Typography>
            )}
            {sessionId && (
              <Typography
                variant="small"
                className="text-muted-foreground mt-2"
              >
                Session ID: {sessionId}
              </Typography>
            )}
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard/appointments">
                <Calendar className="h-4 w-4 mr-2" />
                View My Bookings
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/services">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
