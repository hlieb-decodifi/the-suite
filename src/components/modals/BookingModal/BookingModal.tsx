'use client';

import {
  BookingFormValues,
  BookingFormWithMockData,
} from '@/components/forms/BookingForm';
import { BookingCompleted } from '@/components/templates/BookingModalTemplate/components/BookingCompleted';
import { useBookingState } from '@/components/templates/BookingModalTemplate/hooks/useBookingState';
import { createCompletedViewProps } from '@/components/templates/BookingModalTemplate/utils';
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
import { useState } from 'react';

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
function BookingModalFooter({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  return (
    <DialogFooter className="flex items-center justify-between p-4 border-t bg-background sticky bottom-0 left-0 right-0">
      <div className="w-full flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="sm:flex-initial w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="booking-form"
          disabled={isSubmitting}
          className="sm:flex-initial w-full sm:w-auto"
        >
          {isSubmitting ? 'Processing...' : `Book Now`}
        </Button>
      </div>
    </DialogFooter>
  );
}

// Extracted booking form view to reduce main function size
function BookingFormView({
  service,
  additionalServices,
  isLoadingAdditionalServices,
  availablePaymentMethods,
  isLoadingPaymentMethods,
  isSubmitting,
  onFormSuccess,
  onCancel,
}: {
  service: ServiceListItem;
  additionalServices: ServiceListItem[];
  isLoadingAdditionalServices: boolean;
  availablePaymentMethods: { id: string; name: string }[];
  isLoadingPaymentMethods: boolean;
  isSubmitting: boolean;
  onFormSuccess: (
    bookingId: string,
    formData: BookingFormValues,
    total: number,
  ) => void;
  onCancel: () => void;
}) {
  return (
    <DialogContent className="flex flex-col p-0 sm:max-w-[600px] md:max-w-[800px] max-h-[90vh] h-[90vh] overflow-hidden">
      <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between">
          <DialogTitle>Book a Service</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <BookingFormWithMockData
          service={service}
          extraServices={additionalServices}
          isLoadingExtraServices={isLoadingAdditionalServices}
          availablePaymentMethods={availablePaymentMethods}
          isLoadingPaymentMethods={isLoadingPaymentMethods}
          onSubmitSuccess={onFormSuccess}
        />
      </div>

      <BookingModalFooter isSubmitting={isSubmitting} onCancel={onCancel} />
    </DialogContent>
  );
}

/**
 * BookingModal with fixed header and footer
 */
export function BookingModal(props: BookingModalProps) {
  // Track loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookingState = useBookingState(props);
  const {
    isOpen,
    service,
    bookingCompleted,
    bookingId,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    paymentMethods,
    isLoadingPaymentMethods,
    handleOpenChange,
    handleSuccess,
  } = bookingState;

  // Wrap the success handler to capture loading state
  const handleFormSuccess = (
    bookingId: string,
    formData: BookingFormValues,
    total: number,
  ) => {
    setIsSubmitting(true);
    handleSuccess(bookingId, formData, total);
  };

  // Ensure we always have an array of payment methods
  const availablePaymentMethods = Array.isArray(paymentMethods)
    ? paymentMethods
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {bookingCompleted && bookingId ? (
        <BookingCompleted
          {...createCompletedViewProps(
            isOpen,
            handleOpenChange,
            service,
            bookingId,
            bookingDetails,
          )}
        />
      ) : (
        <BookingFormView
          service={service}
          additionalServices={additionalServices}
          isLoadingAdditionalServices={isLoadingAdditionalServices}
          availablePaymentMethods={availablePaymentMethods}
          isLoadingPaymentMethods={isLoadingPaymentMethods}
          isSubmitting={isSubmitting}
          onFormSuccess={handleFormSuccess}
          onCancel={() => handleOpenChange(false)}
        />
      )}
    </Dialog>
  );
}
