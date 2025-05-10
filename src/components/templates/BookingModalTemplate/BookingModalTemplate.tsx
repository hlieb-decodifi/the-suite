'use client';

import { BookingForm } from '@/components/forms/BookingForm/BookingForm';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { BookingCompleted } from './components/BookingCompleted';
import { useBookingState } from './hooks/useBookingState';
import { PaymentMethod } from './hooks/usePaymentMethods';
import { createCompletedViewProps } from './utils';

/**
 * Template component for booking a service
 */
export type BookingModalTemplateProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceListItem;
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
    isLoadingTimeSlots,
    handleOpenChange,
    handleSuccess,
    selectedDate,
    handleDateSelect,
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
    <BookingForm
      service={service}
      extraServices={additionalServices}
      isLoadingExtraServices={isLoadingAdditionalServices}
      availablePaymentMethods={availablePaymentMethods}
      isLoadingPaymentMethods={isLoadingPaymentMethods}
      availableTimeSlots={availableTimeSlots}
      isLoadingTimeSlots={isLoadingTimeSlots}
      availableDays={availableDays}
      onSubmitSuccess={handleSuccess}
      selectedDate={selectedDate}
      onSelectDate={handleDateSelect}
    />
  );
}
