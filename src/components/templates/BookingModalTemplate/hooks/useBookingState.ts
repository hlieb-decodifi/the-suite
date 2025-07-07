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
import { createBookingWithStripePayment } from '@/server/domains/stripe-payments/actions';
import { format } from 'date-fns';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getUserTimezone } from '@/utils/timezone';

export type BookingModalProps = {
  isOpen: boolean;
  service: ServiceListItem;
  onBookingComplete?: (bookingId: string) => void;
};

/**
 * Custom hook to manage booking states and data fetching with timezone awareness
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
  
  // Get client's timezone
  const clientTimezone = getUserTimezone();
  
  // Fetch professional's timezone using profile_id
  const { 
    data: professionalTimezone = 'UTC',
    isLoading: isLoadingTimezone
  } = useQuery({
    queryKey: ['professionalTimezone', professionalProfileId],
    queryFn: async () => {
      // Fetch timezone directly from professional_profiles table
      const supabase = await import('@/lib/supabase/client').then(m => m.createClient());
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('timezone')
        .eq('id', professionalProfileId)
        .single();
      
      if (error || !data) {
        return 'UTC';
      }
      
      return data.timezone || 'UTC';
    },
    enabled: Boolean(professionalProfileId) && isOpen,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Fetch available dates with timezone context
  const { 
    data: availableDays = [],
    refetch: refetchAvailableDays,
    isPending: isLoadingCalendar
  } = useAvailableDates(
    professionalProfileId,
    professionalTimezone,
    clientTimezone,
    isOpen && !isLoadingTimezone
  );

  // Fetch available time slots when a date is selected
  const formattedDate = useMemo(() => 
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  , [selectedDate]);

  // Use the memoized formatted date for the API call with timezone context
  const { 
    data: availableTimeSlots = [], 
    isLoading: isLoadingTimeSlots,
    refetch: refetchTimeSlots
  } = useAvailableTimeSlots(
    professionalProfileId,
    formattedDate,
    professionalTimezone,
    clientTimezone,
    isOpen && Boolean(selectedDate) && !isLoadingTimezone
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
  
  // Success handler with Stripe payment integration
  const handleSuccess = async (
    formData: BookingFormValues, 
    totalPrice: number
  ) => {
    try {
      setIsSubmitting(true);
      
      // Execute the server action to create the booking with Stripe payment
      const paymentResult = await createBookingWithStripePayment(
        formData,
        professionalProfileId
      );
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to process booking');
      }

      // If payment is required, redirect to Stripe checkout
      if (paymentResult.requiresPayment && paymentResult.checkoutUrl) {
        // Store booking details for when user returns
        setBookingDetails(createBookingDetails(formData, totalPrice));
        
        toast({
          title: 'Redirecting to Payment',
          description: 'You will be redirected to complete your payment.',
        });
        
        // Redirect to Stripe checkout
        window.location.href = paymentResult.checkoutUrl;
        return;
      }
      
      // If no payment required or payment completed, show success
      // Manually invalidate and refetch data to ensure up-to-date availability
      queryClient.invalidateQueries({ 
        queryKey: ['availableTimeSlots', professionalProfileId]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['availableDates', professionalProfileId]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['professionalTimezone', professionalProfileId]
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
      
      // Use the booking ID from the payment result
      if (onBookingComplete && paymentResult.bookingId) {
        onBookingComplete(paymentResult.bookingId);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: error instanceof Error ? error.message : 'There was an error processing your booking. Please try again.',
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
    isLoadingCalendar: isLoadingCalendar || isLoadingTimezone,
    professionalTimezone,
    clientTimezone
  };
} 