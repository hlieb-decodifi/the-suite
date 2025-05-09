import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { BookingDetailsState } from './helpers';

export type BookingCompletedProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookingDetails: {
    bookingId: string;
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
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  service: ServiceListItem,
  bookingId: string,
  bookingDetails: BookingDetailsState
): BookingCompletedProps {
  return {
    isOpen,
    onOpenChange,
    bookingDetails: {
      bookingId,
      serviceName: service.name,
      professionalName: service.professional?.name || 'Professional',
      date: bookingDetails.date,
      timeSlot: bookingDetails.timeSlot,
      totalPrice: bookingDetails.totalPrice,
    },
  };
} 