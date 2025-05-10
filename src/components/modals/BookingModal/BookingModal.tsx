'use client';

import { BookingModalTemplate } from '@/components/templates/BookingModalTemplate';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

/**
 * Component for booking a service
 */
export type BookingModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceListItem;
  onBookingComplete?: (bookingId: string) => void;
};

// Extracted footer component to reduce main function size
function BookingModalFooter({ onCancel }: { onCancel: () => void }) {
  return (
    <DialogFooter className="flex items-center justify-between p-4 border-t bg-background sticky bottom-0 left-0 right-0">
      <div className="w-full flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          className="sm:flex-initial w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="booking-form"
          className="sm:flex-initial w-full sm:w-auto"
        >
          Book Now
        </Button>
      </div>
    </DialogFooter>
  );
}

/**
 * BookingModal with fixed header and footer
 */
export function BookingModal(props: BookingModalProps) {
  const { isOpen, onOpenChange } = props;
  const onCancel = () => onOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0 sm:max-w-[600px] md:max-w-[800px] max-h-[90vh] h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle>Book a Service</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <BookingModalTemplate {...props} />
        </div>
        <BookingModalFooter onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
