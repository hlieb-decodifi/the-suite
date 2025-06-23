'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cancelBookingAction } from '@/server/domains/bookings/actions';
import { useToast } from '@/components/ui/use-toast';

type BookingCancellationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  appointmentDate: string;
  professionalName: string;
};

export function BookingCancellationModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  appointmentDate,
  professionalName,
}: BookingCancellationModalProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a reason for cancellation.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await cancelBookingAction(
        bookingId,
        cancellationReason.trim(),
      );

      if (result.success) {
        toast({
          title: 'Booking Cancelled',
          description:
            'Your booking has been successfully cancelled. Email notifications have been sent.',
        });
        onClose();
        onSuccess?.();
        // Page will automatically update due to revalidatePath in the server action
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.error || 'Failed to cancel booking. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCancellationReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Cancel Booking
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base">
            Are you sure you want to cancel your appointment?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Details */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Professional:
                </span>
                <span className="text-sm font-medium">{professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm font-medium">{appointmentDate}</span>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. Your booking will be cancelled and
              both you and the professional will be notified.
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label
              htmlFor="cancellation-reason"
              className="text-sm font-medium"
            >
              Reason for cancellation{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please explain why you're cancelling this appointment..."
              className="min-h-[100px] resize-none"
              disabled={isLoading}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {cancellationReason.length}/500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading || !cancellationReason.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
