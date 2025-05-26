import { BookingFormValues } from '@/components/forms/BookingForm';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { useToast } from '@/components/ui/use-toast';
import { useState, useMemo } from 'react';
import {
  BookingDetailsState,
  createBookingDetails,
  resetBookingState
} from '../helpers';
import { usePaymentMethods } from './usePaymentMethods';
import { useAdditionalServices } from './useAdditionalServices';
import { useAvailableDates } from './useAvailableDates';
import { useAvailableTimeSlots } from './useAvailableTimeSlots';
import { createBooking } from '../actions';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export type BookingModalProps = {
  isOpen: boolean;
  service: ServiceListItem;
  onBookingComplete?: (bookingId: string) => void;
};

/**
 * Custom hook to manage booking states and data fetching
 */
export function useBookingState(props: BookingModalProps) {
  const { 
    isOpen, 
    service, 
    onBookingComplete 
  } = props;
  
  // State for tracking booking process
  const { toast } = useToast();
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetailsState>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get React Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Get professional info for API calls
  const professional = service.professional;
  const professionalProfileId = professional.profile_id || '';
  
  // Fetch available dates
  const { 
    data: availableDays = [],
    refetch: refetchAvailableDays,
    isPending: isLoadingCalendar
  } = useAvailableDates(professionalProfileId, isOpen);

  // Fetch available time slots when a date is selected
  const formattedDate = useMemo(() => 
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  , [selectedDate]);

  // Use the memoized formatted date for the API call
  const { 
    data: availableTimeSlots = [], 
    isLoading: isLoadingTimeSlots,
    refetch: refetchTimeSlots
  } = useAvailableTimeSlots(
    professionalProfileId,
    formattedDate,
    isOpen && Boolean(selectedDate)
  );

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
      resetBookingState(setBookingCompleted, setBookingDetails);
      setSelectedDate(undefined);
      setIsSubmitting(false);
    }
  };
  
  // Date selection handler
  const handleDateSelect = (date: Date | undefined) => {
    // Force the date to be either a Date object or undefined with no extra funny business
    const newDate = date ? new Date(date.getTime()) : undefined;

    setSelectedDate(newDate);
  };
  
  // Success handler
  const handleSuccess = async (
    formData: BookingFormValues, 
    totalPrice: number
  ) => {
    try {
      setIsSubmitting(true);
      
      // Execute the server action to create the booking
      const { bookingId } = await createBooking(
        formData,
        professionalProfileId
      );
      
      // Manually invalidate and refetch data to ensure up-to-date availability
      queryClient.invalidateQueries({ 
        queryKey: ['availableTimeSlots', professionalProfileId]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['availableDates', professionalProfileId]
      });
      
      // Explicit refetch of data
      refetchAvailableDays();
      if (formattedDate) {
        refetchTimeSlots();
      }
      
      // Update UI state
      setBookingDetails(createBookingDetails(formData, totalPrice));
      setBookingCompleted(true);
      
      toast({
        title: 'Booking Confirmed!',
        description: `Your booking with ${professional?.name || 'the professional'} has been confirmed.`,
      });
      
      // Use the real booking ID from the server
      if (onBookingComplete) onBookingComplete(bookingId);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: 'There was an error processing your booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    service,
    bookingCompleted,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    availableTimeSlots,
    availableDays,
    paymentMethods,
    isLoadingPaymentMethods,
    isSubmitting,
    handleOpenChange,
    handleSuccess,
    handleDateSelect,
    selectedDate,
    isLoadingTimeSlots,
    isLoadingCalendar
  };
} 