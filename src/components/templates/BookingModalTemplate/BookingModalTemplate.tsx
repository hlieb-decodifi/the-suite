'use client';

import { BookingForm } from '@/components/forms/BookingForm/BookingForm';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookingCompleted } from './components/BookingCompleted';
import { useBookingState } from './hooks/useBookingState';
import { createCompletedViewProps } from './utils';
import { PaymentMethod } from './hooks/usePaymentMethods';

/**
 * Template component for booking a service
 */
export type BookingModalTemplateProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceListItem;
  onBookingComplete?: (bookingId: string) => void;
};

/**
 * BookingModalTemplate handles the state and view selection for the booking process
 */
export function BookingModalTemplate(props: BookingModalTemplateProps) {
  const {
    isOpen,
    service,
    bookingCompleted,
    bookingId,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    availableTimeSlots,
    availableDays,
    paymentMethods,
    isLoadingPaymentMethods,
    handleOpenChange,
    handleSuccess,
  } = useBookingState(props);

  // Ensure we always have an array of payment methods
  const availablePaymentMethods: PaymentMethod[] = Array.isArray(paymentMethods)
    ? paymentMethods
    : [];

  // Render completed view or booking form based on state
  if (bookingCompleted && bookingId) {
    const completedProps = createCompletedViewProps(
      isOpen,
      handleOpenChange,
      service,
      bookingId,
      bookingDetails,
    );
    return <BookingCompleted {...completedProps} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Service</DialogTitle>
        </DialogHeader>
        <BookingForm
          service={service}
          extraServices={additionalServices}
          isLoadingExtraServices={isLoadingAdditionalServices}
          availablePaymentMethods={availablePaymentMethods}
          isLoadingPaymentMethods={isLoadingPaymentMethods}
          availableTimeSlots={availableTimeSlots}
          availableDays={availableDays}
          onSubmitSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
