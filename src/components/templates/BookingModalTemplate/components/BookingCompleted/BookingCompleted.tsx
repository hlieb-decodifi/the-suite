'use client';

import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { CheckCircle } from 'lucide-react';
import { BookingCompletedProps } from '../../utils';

// Components
const BookingSummary = ({
  serviceName,
  date,
  timeSlot,
  totalPrice,
}: {
  serviceName: string;
  date: Date | undefined;
  timeSlot: string | undefined;
  totalPrice: number | undefined;
}) => (
  <div className="w-full max-w-xs mt-4 p-4 rounded-lg border border-border bg-muted/20">
    <div className="space-y-3">
      <div className="flex justify-between">
        <Typography variant="small" className="text-muted-foreground">
          Service:
        </Typography>
        <Typography variant="small" className="font-medium">
          {serviceName}
        </Typography>
      </div>
      <div className="flex justify-between">
        <Typography variant="small" className="text-muted-foreground">
          Date:
        </Typography>
        <Typography variant="small" className="font-medium">
          {date?.toLocaleDateString()}
        </Typography>
      </div>
      <div className="flex justify-between">
        <Typography variant="small" className="text-muted-foreground">
          Time:
        </Typography>
        <Typography variant="small" className="font-medium">
          {timeSlot}
        </Typography>
      </div>
      {totalPrice !== undefined && (
        <div className="flex justify-between">
          <Typography variant="small" className="text-muted-foreground">
            Total:
          </Typography>
          <Typography variant="small" className="font-medium">
            {formatCurrency(totalPrice)}
          </Typography>
        </div>
      )}
    </div>
  </div>
);

export function BookingCompleted({
  bookingDetails,
}: Omit<BookingCompletedProps, 'isOpen'>) {
  const { serviceName, professionalName, date, timeSlot, totalPrice } =
    bookingDetails;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" />
      </div>
      <Typography variant="h4" className="text-center">
        Booking Confirmed!
      </Typography>
      <Typography className="text-center text-muted-foreground">
        Your appointment with {professionalName} has been booked.
      </Typography>

      <BookingSummary
        serviceName={serviceName}
        date={date}
        timeSlot={timeSlot}
        totalPrice={totalPrice}
      />
    </div>
  );
}
