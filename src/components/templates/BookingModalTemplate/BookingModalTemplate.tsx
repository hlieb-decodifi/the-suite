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
  onBookingComplete?: (bookingId: string) => void;
  onSubmitStateChange?: (isSubmitting: boolean) => void;
  onBookingStart?: () => void;
  onBookingEnd?: () => void;
};

/**
 * BookingModalTemplate handles the state and view selection for the booking process
 */
export function BookingModalTemplate(props: BookingModalTemplateProps) {
  const {
    service,
    bookingCompleted,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    availableTimeSlots,
    availableDays,
    paymentMethods,
    isLoadingPaymentMethods,
    isLoadingTimeSlots,
    isLoadingCalendar,
    handleSuccess,
    selectedDate,
    handleDateSelect,
  } = useBookingState(props);

  console.log('availableDays', availableDays);
  console.log('availableTimeSlots', availableTimeSlots);

  // Ensure we always have an array of payment methods
  const availablePaymentMethods: PaymentMethod[] = Array.isArray(paymentMethods)
    ? paymentMethods
    : [];

  // Render completed view or booking form based on state
  if (bookingCompleted) {
    const completedProps = createCompletedViewProps(service, bookingDetails);
    return <BookingCompleted {...completedProps} />;
  }

  // Debug log for when submission state changes
  const handleSubmitStateChange = (isSubmitting: boolean) => {
    if (props.onSubmitStateChange) {
      props.onSubmitStateChange(isSubmitting);
    }
  };

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
      onSubmitStateChange={handleSubmitStateChange}
      isCalendarLoading={isLoadingCalendar}
    />
  );
}
