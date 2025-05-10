import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { BookingDetailsState } from './helpers';

export type BookingCompletedProps = {
  bookingDetails: {
    serviceName: string;
    professionalName: string;
    date: Date | undefined;
    timeSlot: string | undefined;
    totalPrice: number | undefined;
  };
};

/**
 * Create props for the BookingCompleted component
 */
export function createCompletedViewProps(
  service: ServiceListItem,
  bookingDetails: BookingDetailsState
): BookingCompletedProps {
  return {
    bookingDetails: {
      serviceName: service.name,
      professionalName: service.professional?.name || 'Professional',
      date: bookingDetails.date,
      timeSlot: bookingDetails.timeSlot,
      totalPrice: bookingDetails.totalPrice,
    },
  };
} 