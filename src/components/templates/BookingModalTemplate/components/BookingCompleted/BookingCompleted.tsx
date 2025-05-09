'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatCurrency';
import { CheckCircle, X } from 'lucide-react';
import { BookingCompletedProps } from '../../utils';

// Components
const BookingSummary = ({
  bookingId,
  serviceName,
  date,
  timeSlot,
  totalPrice,
}: {
  bookingId: string;
  serviceName: string;
  date: Date | undefined;
  timeSlot: string | undefined;
  totalPrice: number | undefined;
}) => (
  <div className="w-full max-w-xs mt-4 p-4 rounded-lg border border-border bg-muted/20">
    <div className="space-y-3">
      <div className="flex justify-between">
        <Typography variant="small" className="text-muted-foreground">
          Booking ID:
        </Typography>
        <Typography variant="small" className="font-medium">
          {bookingId}
        </Typography>
      </div>
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
  isOpen,
  onOpenChange,
  bookingDetails,
}: BookingCompletedProps) {
  const {
    bookingId,
    serviceName,
    professionalName,
    date,
    timeSlot,
    totalPrice,
  } = bookingDetails;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Booking Confirmed</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

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
            bookingId={bookingId}
            serviceName={serviceName}
            date={date}
            timeSlot={timeSlot}
            totalPrice={totalPrice}
          />
        </div>

        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
