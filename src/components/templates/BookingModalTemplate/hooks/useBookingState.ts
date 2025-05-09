import { BookingFormValues } from '@/components/forms/BookingForm';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import {
  BookingDetailsState,
  createBookingDetails,
  resetBookingState
} from '../helpers';
import { usePaymentMethods } from './usePaymentMethods';
import { useAdditionalServices } from './useAdditionalServices';

export type BookingModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceListItem;
  onBookingComplete?: (bookingId: string) => void;
};

/**
 * Custom hook to manage booking states and data fetching
 */
export function useBookingState(props: BookingModalProps) {
  const { 
    isOpen, 
    onOpenChange, 
    service, 
    onBookingComplete 
  } = props;
  
  // State for tracking booking process
  const { toast } = useToast();
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetailsState>({});
  
  // Get professional info for API calls
  const professional = service.professional;
  const professionalProfileId = professional.profile_id;
  
  // Use React Query to fetch payment methods
  const { 
    data: paymentMethods,
    isLoading: isLoadingPaymentMethods
  } = usePaymentMethods(
    professionalProfileId,
    isOpen
  );
  
  // Use React Query to fetch additional services
  const {
    data: additionalServices = [],
    isLoading: isLoadingAdditionalServices
  } = useAdditionalServices(
    professionalProfileId,
    service.id,
    isOpen
  );
  
  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetBookingState(setBookingCompleted, setBookingId, setBookingDetails);
    }
    onOpenChange(open);
  };
  
  // Success handler
  const handleSuccess = (id: string, formData: BookingFormValues, price: number) => {
    setBookingId(id);
    setBookingDetails(createBookingDetails(formData, price));
    setBookingCompleted(true);
    
    toast({
      title: 'Booking Confirmed!',
      description: `Your booking with ${professional?.name || 'the professional'} has been confirmed.`,
    });
    
    if (onBookingComplete) onBookingComplete(id);
  };

  return {
    isOpen,
    service,
    bookingCompleted,
    bookingId,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    availableTimeSlots: [],
    availableDays: [],
    paymentMethods,
    isLoadingPaymentMethods,
    handleOpenChange,
    handleSuccess
  };
} 